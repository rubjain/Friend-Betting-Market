import type { MarketGeneratorResult } from "./types";

export function cryptoMarketGenerator(): MarketGeneratorResult {
  return {
    sourceName: "crypto-stub",
    markets: [
      {
        question: "Will Bitcoin close above $100,000 on May 31, 2026?",
        category: "crypto",
        closeTime: "2026-06-01T00:00:00.000Z",
        resolutionTime: "2026-06-01T01:00:00.000Z",
        resolutionSource: "Coinbase BTC-USD closing reference price",
        resolutionRules:
          "Resolves YES if the selected BTC-USD reference price is strictly greater than 100000 at the end of May 31, 2026 UTC. Resolves NO otherwise. Admin must verify the source before publishing.",
        externalSourceName: "crypto-stub",
        externalSourceId: "btc-above-100k-2026-05-31",
        metadata: {
          asset: "BTC",
          quoteCurrency: "USD",
          dataProvider: "placeholder",
        },
      },
    ],
  };
}
