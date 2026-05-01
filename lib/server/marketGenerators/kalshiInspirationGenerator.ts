import type { MarketGeneratorResult } from "./types";

export function kalshiInspirationGenerator(): MarketGeneratorResult {
  return {
    sourceName: "kalshi-inspiration-stub",
    markets: [
      {
        question: "Will a temperature record be broken in San Francisco this month?",
        category: "kalshi",
        closeTime: "2026-06-01T06:59:00.000Z",
        resolutionTime: "2026-06-02T00:00:00.000Z",
        resolutionSource: "National Weather Service daily climate report",
        resolutionRules:
          "Resolves YES if the official station selected by the admin reports a new daily high temperature record during the calendar month. Resolves NO otherwise. Admin must set the exact weather station before publishing.",
        externalSourceName: "kalshi-inspiration-stub",
        externalSourceId: "sf-temperature-record-2026-05",
        metadata: {
          inspiredBy: "event-contract-format",
          dataProvider: "placeholder",
        },
      },
    ],
  };
}
