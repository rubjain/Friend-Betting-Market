import type { MarketGeneratorResult } from "./types";

export function financeMarketGenerator(): MarketGeneratorResult {
  return {
    sourceName: "finance-stub",
    markets: [
      {
        question: "Will the S&P 500 close higher on the next trading day?",
        category: "finance",
        closeTime: "2026-05-01T20:00:00.000Z",
        resolutionTime: "2026-05-01T21:00:00.000Z",
        resolutionSource: "Official S&P 500 closing level",
        resolutionRules:
          "Resolves YES if the official S&P 500 closing level is higher than the prior official close. Resolves NO if it is equal to or lower. Admin must confirm market hours and holidays before publishing.",
        externalSourceName: "finance-stub",
        externalSourceId: "sp500-higher-next-trading-day-2026-05-01",
        metadata: {
          index: "SPX",
          dataProvider: "placeholder",
        },
      },
    ],
  };
}
