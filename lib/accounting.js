export function createLedgerEntry(entry, timestamp = new Date().toISOString()) {
  return {
    timestamp,
    metadata: "",
    ...entry,
    timestamp: entry.timestamp ?? timestamp,
  };
}

export function createFundsCreditEntry({
  userId,
  amount,
  currencyType,
  source,
  metadata,
  timestamp,
}) {
  return createLedgerEntry(
    {
      user_id: userId,
      market_id: null,
      bet_id: null,
      transaction_type: "credit",
      amount,
      currency_type: currencyType,
      source,
      metadata,
    },
    timestamp,
  );
}

export function createBetLedgerEntries({
  userId,
  marketId,
  betId,
  side,
  marketTitle,
  withdrawableStake,
  bonusStake,
  timestamp,
}) {
  const entries = [];

  if (withdrawableStake > 0) {
    entries.push(
      createLedgerEntry(
        {
          user_id: userId,
          market_id: marketId,
          bet_id: betId,
          transaction_type: "debit",
          amount: withdrawableStake,
          currency_type: "withdrawable",
          source: "bet_placed",
          metadata: `Placed ${side} bet on ${marketTitle}`,
        },
        timestamp,
      ),
    );
  }

  if (bonusStake > 0) {
    entries.push(
      createLedgerEntry(
        {
          user_id: userId,
          market_id: marketId,
          bet_id: betId,
          transaction_type: "debit",
          amount: bonusStake,
          currency_type: "bonus",
          source: "bet_placed",
          metadata: `Placed ${side} bet on ${marketTitle}`,
        },
        timestamp,
      ),
    );
  }

  return entries;
}

export function createSettlementLedgerEntries({ userId, market, bet, settlement, timestamp }) {
  const entries = [];

  if (settlement.totalWithdrawableReturn > 0) {
    entries.push(
      createLedgerEntry(
        {
          user_id: userId,
          market_id: market.id,
          bet_id: bet.id,
          transaction_type: "credit",
          amount: settlement.totalWithdrawableReturn,
          currency_type: "withdrawable",
          source: "market_payout",
          metadata: `Resolved ${bet.side} winner on ${bet.market}`,
        },
        timestamp,
      ),
    );
  }

  if (settlement.bonusPayoutFromNormal > 0) {
    entries.push(
      createLedgerEntry(
        {
          user_id: userId,
          market_id: market.id,
          bet_id: bet.id,
          transaction_type: "credit",
          amount: settlement.bonusPayoutFromNormal,
          currency_type: "bonus",
          source: "market_payout",
          metadata: `Bonus-funded portion returned on ${bet.market}`,
        },
        timestamp,
      ),
    );
  }

  if (settlement.socialBonus > 0) {
    entries.push(
      createLedgerEntry(
        {
          user_id: userId,
          market_id: market.id,
          bet_id: bet.id,
          transaction_type: "credit",
          amount: settlement.socialBonus,
          currency_type: "bonus",
          source: "social_boost",
          metadata: `Social boost applied at ${settlement.multiplier.toFixed(2)}x on ${bet.market}`,
        },
        timestamp,
      ),
    );
  }

  return entries;
}

export function createRefundLedgerEntries({ userId, market, bet, timestamp }) {
  const entries = [];

  if ((bet.withdrawableStake ?? 0) > 0) {
    entries.push(
      createLedgerEntry(
        {
          user_id: userId,
          market_id: market.id,
          bet_id: bet.id,
          transaction_type: "credit",
          amount: bet.withdrawableStake,
          currency_type: "withdrawable",
          source: "refund",
          metadata: `Refunded withdrawable stake for voided market ${bet.market}`,
        },
        timestamp,
      ),
    );
  }

  if ((bet.bonusStake ?? 0) > 0) {
    entries.push(
      createLedgerEntry(
        {
          user_id: userId,
          market_id: market.id,
          bet_id: bet.id,
          transaction_type: "credit",
          amount: bet.bonusStake,
          currency_type: "bonus",
          source: "refund",
          metadata: `Refunded bonus stake for voided market ${bet.market}`,
        },
        timestamp,
      ),
    );
  }

  return entries;
}

export function createAdminAdjustmentEntry({
  userId,
  amount,
  currencyType = "bonus",
  transactionType = "credit",
  metadata,
  timestamp,
}) {
  return createLedgerEntry(
    {
      user_id: userId,
      market_id: null,
      bet_id: null,
      transaction_type: transactionType,
      amount,
      currency_type: currencyType,
      source: "admin_adjustment",
      metadata,
    },
    timestamp,
  );
}
