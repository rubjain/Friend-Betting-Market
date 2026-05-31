import { defaultState } from "../defaultState.js";
import { calculatePayout } from "../marketMath.js";
import { createRefundLedgerEntries, createSettlementLedgerEntries } from "../accounting.js";
import { getResolutionTemplate } from "../marketTaxonomy.js";
import { hasValidationErrors, validateCreateMarketDraft } from "../validation.js";
import { getDatabaseState, ensureDemoDatabaseSeed, databaseMapping } from "./dbState.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";

function activeRouteIdToMarketId(activeId) {
  return String(activeId || "").startsWith("active_")
    ? String(activeId).slice("active_".length)
    : activeId;
}

function closeDateToDateTime(closeDate) {
  return closeDate ? new Date(`${closeDate}T23:59:00Z`) : null;
}

export async function submitDatabaseMarket({
  draft,
  userId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const errors = validateCreateMarketDraft(draft);

  if (hasValidationErrors(errors)) {
    return {
      ok: false,
      message: "Fix the highlighted market fields before submitting for review.",
      errors,
      state: await getDatabaseState(client, userId),
    };
  }

  const template = getResolutionTemplate(draft.category);
  const market = await client.market.create({
    data: {
      title: draft.title.trim(),
      submittedById: userId,
      category: draft.category,
      description: draft.description.trim(),
      closeAt: closeDateToDateTime(draft.closeDate),
      status: "PENDING",
      yesPrice: 0.5,
      noPrice: 0.5,
      volume: 0,
      eligibleForBonus: false,
      resolutionTemplate: template.template,
      evidenceLinks: draft.sourceUrl?.trim()
        ? {
            create: {
              label: template.evidenceSource,
              url: draft.sourceUrl.trim(),
              sourceType: "submitted",
            },
          }
        : undefined,
      auditEntries: {
        create: {
          actorId: userId,
          action: "market.submitted",
          metadata: { title: draft.title.trim(), category: draft.category },
        },
      },
    },
  });

  return {
    ok: true,
    message: `Submitted "${market.title}" for admin review.`,
    state: await getDatabaseState(client, userId),
  };
}

export async function approveDatabaseMarket({
  pendingId,
  userId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const market = await client.market.findUnique({ where: { id: pendingId } });

  if (!market || market.status !== "PENDING") {
    return { ok: false, message: "Pending market was not found.", state: await getDatabaseState(client, userId) };
  }

  const allMarketsBonusEligible = await client.adminConfig.findUnique({
    where: { key: "bonusFundsEligibility" },
  });

  await client.$transaction([
    client.market.update({
      where: { id: pendingId },
      data: {
        status: "ACTIVE",
        eligibleForBonus: allMarketsBonusEligible?.value === "all_markets",
      },
    }),
    // Seed the AMM liquidity pool at 50/50 with 2% fee
    client.liquidityPool.upsert({
      where: { marketId: pendingId },
      create: {
        marketId: pendingId,
        yesReserve: 1000,
        noReserve: 1000,
        invariant: 1_000_000,
        feeBps: 200,
      },
      update: {}, // preserve any existing pool if already seeded
    }),
    // Record starting price snapshot for the chart
    client.oddsSnapshot.create({
      data: {
        marketId: pendingId,
        yesPrice: 0.5,
        noPrice: 0.5,
        source: "market_open",
      },
    }),
    client.auditTrail.create({
      data: {
        actorId: userId,
        marketId: pendingId,
        action: "market.approved",
        metadata: { title: market.title },
      },
    }),
  ]);

  return {
    ok: true,
    message: `Approved "${market.title}" and moved it to active markets.`,
    state: await getDatabaseState(client, userId),
  };
}

export async function rejectDatabaseMarket({
  pendingId,
  userId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const market = await client.market.findUnique({ where: { id: pendingId } });

  if (!market || market.status !== "PENDING") {
    return { ok: false, message: "Pending market was not found.", state: await getDatabaseState(client, userId) };
  }

  await client.$transaction([
    client.market.update({ where: { id: pendingId }, data: { status: "DRAFT" } }),
    client.auditTrail.create({
      data: {
        actorId: userId,
        marketId: pendingId,
        action: "market.rejected",
        metadata: { title: market.title },
      },
    }),
  ]);

  return {
    ok: true,
    message: `Rejected "${market.title}".`,
    state: await getDatabaseState(client, userId),
  };
}

export async function updateDatabaseMarketLifecycle({
  activeId,
  status,
  userId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const normalized = String(status || "").toLowerCase();
  if (!["active", "paused"].includes(normalized)) {
    return { ok: false, message: "Market status change is not allowed.", state: await getDatabaseState(client, userId) };
  }

  const marketId = activeRouteIdToMarketId(activeId);
  const market = await client.market.findUnique({ where: { id: marketId } });

  if (!market || !["ACTIVE", "PAUSED"].includes(market.status)) {
    return { ok: false, message: "Active market was not found.", state: await getDatabaseState(client, userId) };
  }

  await client.$transaction([
    client.market.update({
      where: { id: marketId },
      data: { status: normalized.toUpperCase() },
    }),
    client.auditTrail.create({
      data: {
        actorId: userId,
        marketId,
        action: "market.lifecycle.updated",
        metadata: { status: normalized },
      },
    }),
  ]);

  return {
    ok: true,
    message: `${market.title} is now ${normalized}.`,
    state: await getDatabaseState(client, userId),
  };
}

function fromConfigRows(rows) {
  return Object.fromEntries(
    Object.keys(defaultState.adminConfig).map((key) => {
      const row = rows.find((item) => item.key === key);
      return [key, row ? row.value : defaultState.adminConfig[key]];
    }),
  );
}

async function writeLedgerEntries(tx, entries) {
  if (!entries.length) {
    return;
  }

  await tx.ledgerEntry.createMany({
    data: entries.map((entry) => ({
      userId: entry.user_id,
      marketId: entry.market_id,
      betId: entry.bet_id,
      transactionType: databaseMapping.toLedgerTransactionType(entry.transaction_type),
      amount: entry.amount,
      currency: databaseMapping.toBalanceCurrency(entry.currency_type),
      source: databaseMapping.toLedgerSource(entry.source),
      metadata: { note: entry.metadata },
    })),
  });
}

/** Single-wallet ledger entry for paper settlements (currency = PAPER). */
function paperLedgerEntry({ userId, marketId, betId, amount, source, note }) {
  return {
    user_id: userId,
    market_id: marketId,
    bet_id: betId,
    transaction_type: "credit",
    amount,
    currency_type: "paper",
    source,
    metadata: note,
  };
}

async function creditBalance(tx, userId, currency, amount) {
  if (amount <= 0) {
    return;
  }

  await tx.balanceAccount.update({
    where: { userId_currency: { userId, currency } },
    data: { balance: { increment: amount } },
  });
}

export async function resolveDatabaseMarket({
  activeId,
  result,
  userId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const marketId = activeRouteIdToMarketId(activeId);
  const normalizedResult = String(result || "").toUpperCase();

  if (!["YES", "NO", "VOID"].includes(normalizedResult)) {
    return { ok: false, message: "Resolution result is not allowed.", state: await getDatabaseState(client, userId) };
  }

  const outcome = await client.$transaction(async (tx) => {
    const [market, configRows] = await Promise.all([
      tx.market.findUnique({
        where: { id: marketId },
        include: { boosts: true, evidenceLinks: true },
      }),
      tx.adminConfig.findMany(),
    ]);

    if (!market || !["ACTIVE", "PAUSED", "RESOLVING", "DISPUTED"].includes(market.status)) {
      return { ok: false, message: "Market was not found in the active queue." };
    }

    const bets = await tx.bet.findMany({
      where: { marketId, status: "OPEN" },
      orderBy: { placedAt: "asc" },
    });
    const marketForPayout = {
      ...market,
      yesPrice: Number(market.yesPrice),
      noPrice: Number(market.noPrice),
      volume: Number(market.volume),
      bonusPayoutCap: market.bonusPayoutCap ? Number(market.bonusPayoutCap) : undefined,
      friendsBoosting: market.boosts.length,
    };
    const adminConfig = fromConfigRows(configRows);

    for (const bet of bets) {
      const betForLedger = {
        id: bet.id,
        side: bet.side,
        market: market.title,
        stake: Number(bet.stake),
        withdrawableStake: Number(bet.withdrawableStake),
        bonusStake: Number(bet.bonusStake),
      };

      // Paper bets live in a single PAPER wallet (no withdrawable/bonus split),
      // so settle them directly instead of through the real-money ratio logic.
      if (bet.isPaper) {
        const stakeAmount = betForLedger.stake;

        if (normalizedResult === "VOID") {
          await creditBalance(tx, bet.userId, "PAPER", stakeAmount);
          await writeLedgerEntries(tx, [
            paperLedgerEntry({
              userId: bet.userId,
              marketId: market.id,
              betId: bet.id,
              amount: stakeAmount,
              source: "refund",
              note: `Refunded paper stake for voided market ${market.title}`,
            }),
          ]);
          await tx.bet.update({ where: { id: bet.id }, data: { status: "VOIDED", settledAt: new Date() } });
          continue;
        }

        if (bet.side === normalizedResult) {
          const storedMultiplier = Number(bet.expectedMultiplier) || 0;
          const oddsMultiplier = storedMultiplier >= 1.3 ? storedMultiplier : 2;
          const settlement = calculatePayout({
            stake: stakeAmount,
            // Treat the whole stake as the funded share so payout ratios are
            // well-defined; the boosted payout (normal + capped social bonus)
            // all returns to the single PAPER wallet.
            withdrawableShare: stakeAmount,
            bonusShare: 0,
            market: marketForPayout,
            adminConfig,
            oddsMultiplier,
          });
          await creditBalance(tx, bet.userId, "PAPER", settlement.boostedPayout);
          await writeLedgerEntries(tx, [
            paperLedgerEntry({
              userId: bet.userId,
              marketId: market.id,
              betId: bet.id,
              amount: settlement.boostedPayout,
              source: "market_payout",
              note: `Resolved ${bet.side} winner on ${market.title}`,
            }),
          ]);
          await tx.bet.update({ where: { id: bet.id }, data: { status: "WON", settledAt: new Date() } });
        } else {
          await tx.bet.update({ where: { id: bet.id }, data: { status: "LOST", settledAt: new Date() } });
        }
        continue;
      }

      if (normalizedResult === "VOID") {
        await creditBalance(tx, bet.userId, "WITHDRAWABLE", betForLedger.withdrawableStake);
        await creditBalance(tx, bet.userId, "BONUS", betForLedger.bonusStake);
        await writeLedgerEntries(
          tx,
          createRefundLedgerEntries({
            userId: bet.userId,
            market,
            bet: betForLedger,
          }),
        );
        await tx.bet.update({ where: { id: bet.id }, data: { status: "VOIDED", settledAt: new Date() } });
        continue;
      }

      if (bet.side === normalizedResult) {
        // Use the real AMM odds stored at bet placement time.
        // Old bets (pre-AMM) have expectedMultiplier ≈ 1.0 (social boost only);
        // treat any value < 1.3 as legacy and fall back to 2× (fixed-odds era).
        const storedMultiplier = Number(bet.expectedMultiplier) || 0;
        const oddsMultiplier = storedMultiplier >= 1.3 ? storedMultiplier : 2;
        const settlement = calculatePayout({
          stake: betForLedger.stake,
          withdrawableShare: betForLedger.withdrawableStake,
          bonusShare: betForLedger.bonusStake,
          market: marketForPayout,
          adminConfig,
          oddsMultiplier,
        });
        await creditBalance(tx, bet.userId, "WITHDRAWABLE", settlement.totalWithdrawableReturn);
        await creditBalance(tx, bet.userId, "BONUS", settlement.totalBonusReturn);
        await writeLedgerEntries(
          tx,
          createSettlementLedgerEntries({
            userId: bet.userId,
            market,
            bet: betForLedger,
            settlement,
          }),
        );
        await tx.bet.update({ where: { id: bet.id }, data: { status: "WON", settledAt: new Date() } });
      } else {
        await tx.bet.update({ where: { id: bet.id }, data: { status: "LOST", settledAt: new Date() } });
      }
    }

    await tx.market.update({
      where: { id: marketId },
      data: {
        status: normalizedResult === "VOID" ? "VOIDED" : "RESOLVED",
        settlementAt: new Date(),
      },
    });
    await tx.marketResolution.upsert({
      where: { marketId },
      update: {
        result: normalizedResult === "VOID" ? null : normalizedResult,
        status: normalizedResult === "VOID" ? "VOIDED" : "FINAL",
        resolverId: userId,
        notes:
          normalizedResult === "VOID"
            ? "Voided through persisted admin workflow and refunded original stakes."
            : `Resolved through persisted admin workflow using ${market.category} criteria.`,
        resolvedAt: new Date(),
      },
      create: {
        marketId,
        result: normalizedResult === "VOID" ? null : normalizedResult,
        status: normalizedResult === "VOID" ? "VOIDED" : "FINAL",
        resolverId: userId,
        notes:
          normalizedResult === "VOID"
            ? "Voided through persisted admin workflow and refunded original stakes."
            : `Resolved through persisted admin workflow using ${market.category} criteria.`,
        resolvedAt: new Date(),
      },
    });
    await tx.auditTrail.create({
      data: {
        actorId: userId,
        marketId,
        action: "market.resolved",
        metadata: { result: normalizedResult, settledBetCount: bets.length },
      },
    });

    return { ok: true, message: `Resolved "${market.title}" as ${normalizedResult}.` };
  });

  return {
    ...outcome,
    state: await getDatabaseState(client, userId),
  };
}
