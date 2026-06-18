export const TRADING_MODES = Object.freeze({
  PAPER: "paper",
  REAL: "real",
});

export const FEE_DESTINATIONS = Object.freeze({
  PLATFORM_REVENUE: "platform_revenue",
  PAPER_BURNED: "paper_burned",
  NONE: "none",
});

function money(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function nonNegative(value) {
  return Math.max(0, money(value));
}

export function normalizeTradingMode({ tradingMode, isPaper } = {}) {
  const rawMode = String(tradingMode || "").toLowerCase();
  if (rawMode === TRADING_MODES.PAPER || isPaper === true) return TRADING_MODES.PAPER;
  return TRADING_MODES.REAL;
}

export function isPaperTrading(modeOrOptions) {
  return normalizeTradingMode(
    typeof modeOrOptions === "string" ? { tradingMode: modeOrOptions } : modeOrOptions,
  ) === TRADING_MODES.PAPER;
}

export function accountModeForTradingMode(tradingMode) {
  return normalizeTradingMode({ tradingMode }).toUpperCase();
}

export function feeDestinationForTradingMode(tradingMode, feeAmount = 0) {
  if (!(nonNegative(feeAmount) > 0)) return FEE_DESTINATIONS.NONE;
  // Paper and real trades share execution math; only fee destination diverges here.
  return isPaperTrading({ tradingMode })
    ? FEE_DESTINATIONS.PAPER_BURNED
    : FEE_DESTINATIONS.PLATFORM_REVENUE;
}

export function calculateFee({ grossAmount, netAmount, feeBps = 0 } = {}) {
  const rate = Math.max(0, money(feeBps)) / 10_000;
  if (!(rate > 0)) return 0;
  if (grossAmount != null) {
    return nonNegative(grossAmount) * rate;
  }
  if (netAmount != null) {
    return rate >= 1 ? 0 : nonNegative(netAmount) * (rate / Math.max(0.000001, 1 - rate));
  }
  return 0;
}

export function buildTradeAmounts({ grossAmount, netAmount, feeBps = 0 } = {}) {
  const feeFromGross = grossAmount != null
    ? calculateFee({ grossAmount, feeBps })
    : calculateFee({ netAmount, feeBps });
  const net = netAmount != null ? nonNegative(netAmount) : Math.max(0, nonNegative(grossAmount) - feeFromGross);
  const fee = feeFromGross;
  return {
    grossAmount: grossAmount != null ? nonNegative(grossAmount) : net + fee,
    feeAmount: fee,
    netAmount: net,
    feeBps: Math.max(0, money(feeBps)),
  };
}

export function buildTradeExecution({ tradingMode, isPaper, grossAmount, netAmount, feeBps = 0 } = {}) {
  const mode = normalizeTradingMode({ tradingMode, isPaper });
  const amounts = buildTradeAmounts({ grossAmount, netAmount, feeBps });
  return {
    tradingMode: mode,
    accountMode: accountModeForTradingMode(mode),
    isPaperTrade: mode === TRADING_MODES.PAPER,
    feeDestination: feeDestinationForTradingMode(mode, amounts.feeAmount),
    ...amounts,
  };
}

export function balanceCurrencyForTradingMode(tradingMode) {
  return isPaperTrading({ tradingMode }) ? "PAPER" : "WITHDRAWABLE";
}

export function feeRevenueLedgerData({ userId, marketId, betId, feeAmount, tradingMode, note }) {
  const mode = normalizeTradingMode({ tradingMode });
  if (mode !== TRADING_MODES.REAL || !(nonNegative(feeAmount) > 0)) return null;
  return {
    userId,
    marketId,
    betId,
    transactionType: "CREDIT",
    amount: feeAmount,
    currency: "WITHDRAWABLE",
    source: "PLATFORM_FEE",
    metadata: {
      note: note || "Real trading fee recorded as platform revenue.",
      tradingMode: mode,
      feeDestination: FEE_DESTINATIONS.PLATFORM_REVENUE,
    },
  };
}
