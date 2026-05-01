export type DraftMarketStatus = "draft" | "open" | "closed" | "resolved" | "rejected";
export type DraftMarketCategory = "sports" | "crypto" | "finance" | "news" | "kalshi";
export type DraftMarketCreatedBy = "system" | "admin" | "user";
export type DraftMarketOutcomeType = "binary";

export type NormalizedDraftMarket = {
  question: string;
  category: DraftMarketCategory | string;
  status?: DraftMarketStatus;
  closeTime: string;
  resolutionTime?: string | null;
  resolutionSource: string;
  resolutionRules: string;
  outcomeType?: DraftMarketOutcomeType;
  yesPrice?: number;
  noPrice?: number;
  createdBy?: DraftMarketCreatedBy;
  externalSourceName?: string | null;
  externalSourceId?: string | null;
  metadata?: Record<string, unknown>;
};

export type DraftMarketRecord = NormalizedDraftMarket & {
  id: string;
  status: DraftMarketStatus;
  outcomeType: DraftMarketOutcomeType;
  yesPrice: number;
  noPrice: number;
  createdBy: DraftMarketCreatedBy;
  normalizedQuestion: string;
  createdAt: string;
  updatedAt: string;
};

export type MarketGeneratorResult = {
  sourceName: string;
  markets: NormalizedDraftMarket[];
};

export type MarketGenerator = () => Promise<MarketGeneratorResult> | MarketGeneratorResult;

export type RunMarketGeneratorsResult = {
  created: number;
  skipped: number;
  errored: number;
  errors: Array<{ sourceName: string; message: string }>;
  drafts: DraftMarketRecord[];
};
