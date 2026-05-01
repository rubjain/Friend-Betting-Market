import { defaultState } from "../defaultState.js";
import { createBetLedgerEntries } from "../accounting.js";
import { getResolutionTemplate } from "../marketTaxonomy.js";
import { prisma } from "./prisma.js";
import crypto from "node:crypto";

function cloneState(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function hashSeedPassword(password = "password123") {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function toNumber(value) {
  return Number(value ?? 0);
}

function toDbMarketStatus(status) {
  return String(status || "active").toUpperCase();
}

function toUiMarketStatus(status) {
  return String(status || "ACTIVE").toLowerCase();
}

function toDbUserRole(user) {
  return user.isAdmin ? "ADMIN" : "USER";
}

function toSeedUsername(user) {
  if (user.username) {
    return user.username;
  }
  return `@${String(user.name || user.id).toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")}`;
}

function toSeedEmail(user) {
  if (user.email) {
    return user.email;
  }
  return `${toSeedUsername(user).replace(/^@/, "")}@example.com`;
}

function toLedgerSource(source) {
  return String(source).toUpperCase();
}

function toLedgerTransactionType(type) {
  return String(type).toUpperCase();
}

function toBalanceCurrency(currency) {
  return String(currency).toUpperCase();
}

function fromBalanceCurrency(currency) {
  return String(currency).toLowerCase();
}

function fromLedgerSource(source) {
  return String(source).toLowerCase();
}

function fromLedgerTransactionType(type) {
  return String(type).toLowerCase();
}

function getAdminConfigValue(configRows, key) {
  const row = configRows.find((item) => item.key === key);
  return row ? row.value : defaultState.adminConfig[key];
}

export async function ensureDemoDatabaseSeed(client = prisma) {
  const userCount = await client.user.count();
  if (userCount > 0) {
    return;
  }

  await client.$transaction(async (tx) => {
    for (const user of defaultState.users) {
      const currentUser = user.id === defaultState.currentUser.id ? defaultState.currentUser : {};
      await tx.user.create({
        data: {
          id: user.id,
          name: user.name,
          username: toSeedUsername({ ...user, ...currentUser }),
          email: toSeedEmail({ ...user, ...currentUser }),
          passwordHash: hashSeedPassword(),
          role: toDbUserRole(currentUser),
          riskStatus: user.risk_status ?? currentUser.settings?.riskStatus ?? "clear",
          riskScore: user.risk_score ?? 0,
          frozen: Boolean(user.frozen),
          balanceAccounts: {
            create: [
              { currency: "WITHDRAWABLE", balance: user.withdrawable_balance ?? 0 },
              { currency: "BONUS", balance: user.bonus_balance ?? 0 },
            ],
          },
          verificationChecks:
            user.id === defaultState.currentUser.id
              ? {
                  create: [
                    { type: "EMAIL", status: "PENDING" },
                    { type: "PHONE", status: "PLACEHOLDER" },
                    { type: "IDENTITY", status: "PLACEHOLDER" },
                    { type: "PAYMENT", status: "PLACEHOLDER" },
                    { type: "DEVICE", status: "PLACEHOLDER" },
                  ],
                }
              : undefined,
        },
      });
    }

    for (const request of defaultState.friends.pending) {
      const username = request.username;
      await tx.user.upsert({
        where: { username },
        update: {},
        create: {
          id: `user_${username.replace(/^@/, "").replace(/[^a-z0-9]/g, "_")}`,
          name: request.name,
          username,
          email: `${username.replace(/^@/, "")}@example.com`,
          passwordHash: hashSeedPassword(),
          riskStatus: "clear",
          balanceAccounts: {
            create: [
              { currency: "WITHDRAWABLE", balance: 0 },
              { currency: "BONUS", balance: 0 },
            ],
          },
        },
      });
    }

    for (const friend of defaultState.friends.list) {
      const addressee = await tx.user.findUnique({ where: { username: friend.username } });
      if (addressee) {
        await tx.friendship.create({
          data: {
            requesterId: defaultState.currentUser.id,
            addresseeId: addressee.id,
            status: "ACCEPTED",
          },
        });
      }
    }

    for (const request of defaultState.friends.pending) {
      const user = await tx.user.findUnique({ where: { username: request.username } });
      if (user) {
        await tx.friendship.create({
          data: {
            requesterId: request.direction === "outgoing" ? defaultState.currentUser.id : user.id,
            addresseeId: request.direction === "outgoing" ? user.id : defaultState.currentUser.id,
            status: "PENDING",
          },
        });
      }
    }

    for (const market of defaultState.markets) {
      await tx.market.create({
        data: {
          id: market.id,
          title: market.title,
          description: market.description,
          category: market.category,
          status: toDbMarketStatus(market.status),
          closeAt: market.closeTime ? new Date(market.closeTime) : null,
          settlementAt: market.settlementTime ? new Date(market.settlementTime) : null,
          yesPrice: market.yesPrice,
          noPrice: market.noPrice,
          volume: market.volume,
          eligibleForBonus: market.eligibleForBonus,
          resolutionTemplate: market.resolutionTemplate,
          evidenceLinks: {
            create: (market.evidenceLinks ?? []).map((evidence) => ({
              label: evidence.label,
              url: evidence.url,
              sourceType: evidence.sourceType,
            })),
          },
        },
      });
    }

    for (const market of defaultState.markets) {
      for (const firstName of market.friendGroup ?? []) {
        const actor = await tx.user.findFirst({
          where: { name: { startsWith: firstName } },
        });
        if (actor) {
          await tx.friendBoost.upsert({
            where: { marketId_actorId: { marketId: market.id, actorId: actor.id } },
            update: {},
            create: { marketId: market.id, actorId: actor.id },
          });
        }
      }
    }

    for (const [key, value] of Object.entries(defaultState.adminConfig)) {
      await tx.adminConfig.create({ data: { key, value } });
    }

    const seedBet = {
      id: "bet_seed_friend_1",
      userId: "user_2",
      marketId: "market_1",
      side: "YES",
      stake: 12,
      withdrawableStake: 12,
      bonusStake: 0,
      placedAt: new Date("2026-04-25T18:30:00Z"),
    };
    const seedMarket = defaultState.markets.find((market) => market.id === seedBet.marketId);
    await tx.bet.create({
      data: {
        id: seedBet.id,
        userId: seedBet.userId,
        marketId: seedBet.marketId,
        side: seedBet.side,
        stake: seedBet.stake,
        withdrawableStake: seedBet.withdrawableStake,
        bonusStake: seedBet.bonusStake,
        expectedMultiplier: 1,
        placedAt: seedBet.placedAt,
      },
    });
    await tx.balanceAccount.update({
      where: { userId_currency: { userId: seedBet.userId, currency: "WITHDRAWABLE" } },
      data: { balance: { decrement: seedBet.withdrawableStake } },
    });
    await tx.ledgerEntry.createMany({
      data: createBetLedgerEntries({
        userId: seedBet.userId,
        marketId: seedBet.marketId,
        betId: seedBet.id,
        side: seedBet.side,
        marketTitle: seedMarket?.title ?? "Seed market",
        withdrawableStake: seedBet.withdrawableStake,
        bonusStake: seedBet.bonusStake,
        timestamp: seedBet.placedAt.toISOString(),
      }).map((entry) => ({
        userId: entry.user_id,
        marketId: entry.market_id,
        betId: entry.bet_id,
        transactionType: toLedgerTransactionType(entry.transaction_type),
        amount: entry.amount,
        currency: toBalanceCurrency(entry.currency_type),
        source: toLedgerSource(entry.source),
        metadata: { note: entry.metadata },
        createdAt: seedBet.placedAt,
      })),
    });
    await tx.userSession.create({
      data: {
        id: "seed_session_user_1",
        userId: defaultState.currentUser.id,
        expiresAt: new Date("2030-01-01T00:00:00Z"),
      },
    });
  });
}

export async function getDatabaseState(client = prisma, currentUserId = defaultState.currentUser.id) {
  await ensureDemoDatabaseSeed(client);

  const [users, markets, ledgerEntries, bets, configRows, friendships] = await Promise.all([
    client.user.findMany({
      include: { balanceAccounts: true, verificationChecks: true },
      orderBy: { createdAt: "asc" },
    }),
    client.market.findMany({
      include: { boosts: true, evidenceLinks: true, resolution: true },
      orderBy: { createdAt: "asc" },
    }),
    client.ledgerEntry.findMany({
      where: { userId: currentUserId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    client.bet.findMany({
      where: { userId: currentUserId },
      include: { market: true },
      orderBy: { placedAt: "desc" },
    }),
    client.adminConfig.findMany(),
    client.friendship.findMany({
      where: {
        OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }],
      },
      include: { requester: { include: { boostsGiven: true } }, addressee: { include: { boostsGiven: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const state = cloneState(defaultState);
  const currentUser = users.find((user) => user.id === currentUserId) ?? users[0];

  state.adminConfig = Object.fromEntries(
    Object.keys(defaultState.adminConfig).map((key) => [key, getAdminConfigValue(configRows, key)]),
  );

  state.users = users.map((user) => {
    const withdrawable = user.balanceAccounts.find((account) => account.currency === "WITHDRAWABLE");
    const bonus = user.balanceAccounts.find((account) => account.currency === "BONUS");
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      withdrawable_balance: toNumber(withdrawable?.balance),
      bonus_balance: toNumber(bonus?.balance),
      risk_status: user.riskStatus,
      risk_score: user.riskScore,
      frozen: user.frozen,
      risk_signals: user.riskStatus === "clear" ? ["Normal activity"] : ["Needs manual review"],
    };
  });

  if (currentUser) {
    const current = state.users.find((user) => user.id === currentUser.id);
    const verificationStatus = Object.fromEntries(
      currentUser.verificationChecks.map((check) => [
        `${String(check.type).toLowerCase()}VerificationStatus`,
        String(check.status).toLowerCase(),
      ]),
    );
    state.currentUser = {
      ...state.currentUser,
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
      email: currentUser.email,
      isAdmin: currentUser.role === "ADMIN",
      withdrawable_balance: current?.withdrawable_balance ?? 0,
      bonus_balance: current?.bonus_balance ?? 0,
      settings: {
        ...state.currentUser.settings,
        ...verificationStatus,
        riskStatus: currentUser.riskStatus,
      },
    };
    state.currentUser.play_credit_balance =
      state.currentUser.withdrawable_balance + state.currentUser.bonus_balance;
  }

  state.markets = markets
    .filter((market) => !["PENDING", "DRAFT"].includes(market.status))
    .map((market) => {
    const template = getResolutionTemplate(market.category);
    const status = toUiMarketStatus(market.status);
    return {
      id: market.id,
      title: market.title,
      description: market.description,
      category: market.category,
      status,
      volume: toNumber(market.volume),
      endDate: market.closeAt ? market.closeAt.toISOString().slice(0, 10) : "",
      closeTime: market.closeAt?.toISOString() ?? null,
      settlementTime: market.settlementAt?.toISOString() ?? null,
      yesPrice: toNumber(market.yesPrice),
      noPrice: toNumber(market.noPrice),
      eligibleForBonus: market.eligibleForBonus,
      bonusPayoutCap: market.bonusPayoutCap ? toNumber(market.bonusPayoutCap) : undefined,
      friendsBoosting: market.boosts.length,
      friendGroup: market.boosts
        .map((boost) => users.find((user) => user.id === boost.actorId)?.name?.split(" ")[0])
        .filter(Boolean),
      resolutionTemplate: market.resolutionTemplate || template.template,
      resolutionChecklist: template.checklist,
      evidenceLinks: market.evidenceLinks.map((evidence) => ({
        label: evidence.label,
        url: evidence.url,
        sourceType: evidence.sourceType,
      })),
      recentActivity: [],
    };
    });

  state.pendingMarkets = markets
    .filter((market) => market.status === "PENDING")
    .map((market) => ({
      id: market.id,
      title: market.title,
      submittedBy: market.submittedById ?? "@unknown",
      createdAt: market.createdAt.toISOString().slice(0, 10),
      category: market.category,
      description: market.description,
      closeDate: market.closeAt?.toISOString().slice(0, 10) ?? "",
      sourceUrl: market.evidenceLinks[0]?.url ?? "",
    }));

  state.activeMarkets = state.markets
    .filter((market) => ["active", "paused"].includes(market.status))
    .map((market) => ({
      id: `active_${market.id}`,
      marketId: market.id,
      title: market.title,
      volume: market.volume,
      status: market.status === "paused" ? "Paused" : "Active",
    }));

  state.resolvedMarkets = markets
    .filter((market) => ["RESOLVED", "VOIDED"].includes(market.status))
    .map((market) => ({
      id: `resolved_${market.id}`,
      title: market.title,
      result: market.status === "VOIDED" ? "VOID" : market.resolution?.result ?? "",
      resolvedAt: market.settlementAt?.toISOString().slice(0, 10) ?? "",
      resolverNotes: market.resolution?.notes ?? "Resolved through persisted admin workflow.",
      evidenceLinks: market.evidenceLinks.map((evidence) => ({
        label: evidence.label,
        url: evidence.url,
        sourceType: evidence.sourceType,
      })),
    }));

  state.friends = {
    ...state.friends,
    list: friendships
      .filter((friendship) => friendship.status === "ACCEPTED")
      .map((friendship) => {
        const other =
          friendship.requesterId === currentUserId ? friendship.addressee : friendship.requester;
        return {
          id: other.id,
          name: other.name,
          username: other.username,
          boostCount: other.boostsGiven.length,
          status: other.riskStatus === "review" || other.riskStatus === "frozen" ? "Monitor" : "Trusted",
        };
      }),
    pending: friendships
      .filter((friendship) => friendship.status === "PENDING")
      .map((friendship) => {
        const outgoing = friendship.requesterId === currentUserId;
        const other = outgoing ? friendship.addressee : friendship.requester;
        return {
          name: other.name,
          username: other.username,
          direction: outgoing ? "outgoing" : "incoming",
        };
      }),
  };

  state.portfolio.openBets = bets
    .filter((bet) => bet.status === "OPEN")
    .map((bet) => {
      const stake = toNumber(bet.stake);
      const withdrawableStake = toNumber(bet.withdrawableStake);
      const bonusStake = toNumber(bet.bonusStake);
      return {
        id: bet.id,
        marketId: bet.marketId,
        market: bet.market.title,
        side: bet.side,
        stake,
        status: "Open",
        funding: `${Math.round((withdrawableStake / stake) * 100)}% withdrawable / ${Math.round(
          (bonusStake / stake) * 100,
        )}% bonus`,
        withdrawableStake,
        bonusStake,
        placedAt: bet.placedAt.toISOString().slice(0, 10),
      };
    });

  state.portfolio.pastBets = bets
    .filter((bet) => bet.status !== "OPEN")
    .map((bet) => ({
      id: bet.id,
      marketId: bet.marketId,
      market: bet.market.title,
      side: bet.side,
      status: bet.status,
      payout: bet.status === "WON" ? toNumber(bet.withdrawableStake) * 2 : 0,
      boost: 0,
      settlement:
        bet.status === "WON"
          ? "Won through persisted market resolution."
          : bet.status === "VOIDED" || bet.status === "REFUNDED"
            ? "Voided. Original withdrawable and bonus stakes were refunded."
            : "Lost. No payout after persisted market resolution.",
    }));

  state.ledger = ledgerEntries.map((entry) => ({
    id: entry.id,
    user_id: entry.userId,
    market_id: entry.marketId,
    bet_id: entry.betId,
    transaction_type: fromLedgerTransactionType(entry.transactionType),
    amount: toNumber(entry.amount),
    currency_type: fromBalanceCurrency(entry.currency),
    source: fromLedgerSource(entry.source),
    timestamp: entry.createdAt.toISOString(),
    metadata: entry.metadata?.note ?? entry.metadata ?? "",
  }));

  return state;
}

export async function resetDatabaseState(client = prisma, currentUserId = defaultState.currentUser.id) {
  await client.$transaction([
    client.auditTrail.deleteMany(),
    client.userSession.deleteMany(),
    client.marketDispute.deleteMany(),
    client.verificationCheck.deleteMany(),
    client.resolutionEvidence.deleteMany(),
    client.marketResolution.deleteMany(),
    client.riskReview.deleteMany(),
    client.friendBoost.deleteMany(),
    client.friendship.deleteMany(),
    client.ledgerEntry.deleteMany(),
    client.bet.deleteMany(),
    client.liquidityPool.deleteMany(),
    client.order.deleteMany(),
    client.oddsSnapshot.deleteMany(),
    client.balanceAccount.deleteMany(),
    client.adminConfig.deleteMany(),
    client.market.deleteMany(),
    client.user.deleteMany(),
  ]);
  await ensureDemoDatabaseSeed(client);
  return getDatabaseState(client, currentUserId);
}

export const databaseMapping = {
  toBalanceCurrency,
  toLedgerSource,
  toLedgerTransactionType,
};
