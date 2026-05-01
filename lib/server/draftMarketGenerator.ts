import { defaultState } from "../defaultState.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";
import { sportsMarketGenerator } from "./marketGenerators/sportsMarketGenerator";
import type {
  DraftMarketRecord,
  DraftMarketStatus,
  MarketGenerator,
  NormalizedDraftMarket,
  RunMarketGeneratorsResult,
} from "./marketGenerators/types";

const generators: MarketGenerator[] = [
  sportsMarketGenerator,
];

type DraftStore = {
  drafts: DraftMarketRecord[];
};

const globalForDrafts = globalThis as typeof globalThis & {
  __friendMarketDraftStore?: DraftStore;
};

const devDraftStore =
  globalForDrafts.__friendMarketDraftStore ??
  (globalForDrafts.__friendMarketDraftStore = { drafts: [] });

export function normalizeQuestion(question: string) {
  return String(question || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toDbStatus(status: DraftMarketStatus) {
  return status.toUpperCase();
}

function toDraftStatus(status: string): DraftMarketStatus {
  const normalized = String(status || "DRAFT").toLowerCase();
  if (["open", "closed", "resolved", "rejected"].includes(normalized)) {
    return normalized as DraftMarketStatus;
  }
  return "draft";
}

function normalizeDraft(input: NormalizedDraftMarket): NormalizedDraftMarket {
  const question = String(input.question || "").trim();
  return {
    ...input,
    question,
    status: input.status ?? "draft",
    outcomeType: "binary",
    yesPrice: input.yesPrice ?? 0.5,
    noPrice: input.noPrice ?? 0.5,
    createdBy: input.createdBy ?? "system",
    externalSourceName: input.externalSourceName ?? null,
    externalSourceId: input.externalSourceId ?? null,
    metadata: input.metadata ?? {},
  };
}

function toRecord(market: any): DraftMarketRecord {
  const question = market.question || market.title || "";
  return {
    id: market.id,
    question,
    category: market.category,
    status: toDraftStatus(market.status),
    closeTime: (market.closeTime ?? market.closeAt)?.toISOString?.() ?? market.closeTime ?? null,
    resolutionTime:
      (market.resolutionTime ?? market.settlementAt)?.toISOString?.() ??
      market.resolutionTime ??
      null,
    resolutionSource: market.resolutionSource ?? "",
    resolutionRules: market.resolutionRules || market.resolutionTemplate || "",
    outcomeType: "binary",
    yesPrice: Number(market.yesPrice ?? 0.5),
    noPrice: Number(market.noPrice ?? 0.5),
    createdBy: String(market.createdBy || "SYSTEM").toLowerCase() as DraftMarketRecord["createdBy"],
    externalSourceName: market.externalSourceName ?? null,
    externalSourceId: market.externalSourceId ?? null,
    metadata: market.metadata ?? {},
    normalizedQuestion: market.normalizedQuestion || normalizeQuestion(question),
    createdAt: market.createdAt?.toISOString?.() ?? market.createdAt ?? new Date().toISOString(),
    updatedAt: market.updatedAt?.toISOString?.() ?? market.updatedAt ?? new Date().toISOString(),
  };
}

async function findDatabaseDuplicate(draft: NormalizedDraftMarket) {
  const normalizedQuestion = normalizeQuestion(draft.question);
  const externalSourceName = draft.externalSourceName || undefined;
  const externalSourceId = draft.externalSourceId || undefined;
  const conditions: any[] = [{ normalizedQuestion }];

  if (externalSourceName && externalSourceId) {
    conditions.unshift({ externalSourceName, externalSourceId });
  }

  return (prisma as any).market.findFirst({
    where: { OR: conditions },
    select: { id: true },
  });
}

async function createDatabaseDraft(draftInput: NormalizedDraftMarket) {
  const draft = normalizeDraft(draftInput);
  const normalizedQuestion = normalizeQuestion(draft.question);
  const closeTime = new Date(draft.closeTime);
  const resolutionTime = draft.resolutionTime ? new Date(draft.resolutionTime) : null;
  const sourceName = draft.externalSourceName || "system-generator";

  return (prisma as any).market.create({
    data: {
      title: draft.question,
      question: draft.question,
      description: `System-generated draft from ${sourceName}. Admin review is required before publishing.`,
      category: draft.category,
      status: "DRAFT",
      closeAt: closeTime,
      closeTime,
      settlementAt: resolutionTime,
      resolutionTime,
      resolutionSource: draft.resolutionSource,
      resolutionRules: draft.resolutionRules,
      resolutionTemplate: draft.resolutionRules,
      yesPrice: draft.yesPrice,
      noPrice: draft.noPrice,
      outcomeType: "BINARY",
      createdBy: "SYSTEM",
      externalSourceName: draft.externalSourceName,
      externalSourceId: draft.externalSourceId,
      normalizedQuestion,
      metadata: draft.metadata,
      volume: 0,
      eligibleForBonus: false,
    },
  });
}

function findDevDuplicate(draft: NormalizedDraftMarket) {
  const normalizedQuestion = normalizeQuestion(draft.question);
  return devDraftStore.drafts.find((market) => {
    const sameExternalId =
      draft.externalSourceId &&
      market.externalSourceId === draft.externalSourceId &&
      market.externalSourceName === draft.externalSourceName;
    return sameExternalId || market.normalizedQuestion === normalizedQuestion;
  });
}

function createDevDraft(draftInput: NormalizedDraftMarket): DraftMarketRecord {
  const draft = normalizeDraft(draftInput);
  const now = new Date().toISOString();
  const record: DraftMarketRecord = {
    ...draft,
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: "draft",
    outcomeType: "binary",
    yesPrice: draft.yesPrice ?? 0.5,
    noPrice: draft.noPrice ?? 0.5,
    createdBy: "system",
    normalizedQuestion: normalizeQuestion(draft.question),
    createdAt: now,
    updatedAt: now,
  };
  devDraftStore.drafts.unshift(record);
  return record;
}

export async function listDraftMarkets(): Promise<DraftMarketRecord[]> {
  if (!hasDatabaseUrl()) {
    return devDraftStore.drafts.filter((market) => market.status === "draft");
  }

  const markets = await (prisma as any).market.findMany({
    where: { status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });
  return markets.map(toRecord);
}

export async function updateDraftMarket(
  id: string,
  payload: Partial<Pick<NormalizedDraftMarket, "question" | "closeTime" | "resolutionSource" | "resolutionRules">>,
) {
  const question = payload.question?.trim();
  const normalizedQuestion = question ? normalizeQuestion(question) : undefined;

  if (!hasDatabaseUrl()) {
    const draft = devDraftStore.drafts.find((market) => market.id === id);
    if (!draft || draft.status !== "draft") {
      return null;
    }
    if (question) {
      draft.question = question;
      draft.normalizedQuestion = normalizedQuestion || draft.normalizedQuestion;
    }
    if (payload.closeTime) draft.closeTime = payload.closeTime;
    if (payload.resolutionSource !== undefined) draft.resolutionSource = payload.resolutionSource;
    if (payload.resolutionRules !== undefined) draft.resolutionRules = payload.resolutionRules;
    draft.updatedAt = new Date().toISOString();
    return draft;
  }

  const data: any = {};
  if (question) {
    data.title = question;
    data.question = question;
    data.normalizedQuestion = normalizedQuestion;
  }
  if (payload.closeTime) {
    data.closeAt = new Date(payload.closeTime);
    data.closeTime = new Date(payload.closeTime);
  }
  if (payload.resolutionSource !== undefined) {
    data.resolutionSource = payload.resolutionSource;
  }
  if (payload.resolutionRules !== undefined) {
    data.resolutionRules = payload.resolutionRules;
    data.resolutionTemplate = payload.resolutionRules;
  }

  const market = await (prisma as any).market.update({
    where: { id },
    data,
  });
  return toRecord(market);
}

export async function approveDraftMarket(id: string, userId = defaultState.currentUser.id) {
  if (!hasDatabaseUrl()) {
    const draft = devDraftStore.drafts.find((market) => market.id === id);
    if (!draft || draft.status !== "draft") {
      return null;
    }
    draft.status = "open";
    draft.updatedAt = new Date().toISOString();
    return draft;
  }

  const market = await (prisma as any).market.update({
    where: { id },
    data: {
      status: "OPEN",
      auditEntries: {
        create: {
          actorId: userId,
          action: "market.generated_draft.approved",
          metadata: { published: true },
        },
      },
    },
  });
  return toRecord(market);
}

export async function rejectDraftMarket(id: string, userId = defaultState.currentUser.id) {
  if (!hasDatabaseUrl()) {
    const draft = devDraftStore.drafts.find((market) => market.id === id);
    if (!draft || draft.status !== "draft") {
      return null;
    }
    draft.status = "rejected";
    draft.updatedAt = new Date().toISOString();
    return draft;
  }

  const market = await (prisma as any).market.update({
    where: { id },
    data: {
      status: "REJECTED",
      auditEntries: {
        create: {
          actorId: userId,
          action: "market.generated_draft.rejected",
        },
      },
    },
  });
  return toRecord(market);
}

export async function runMarketGenerators(): Promise<RunMarketGeneratorsResult> {
  const result: RunMarketGeneratorsResult = {
    created: 0,
    skipped: 0,
    errored: 0,
    errors: [],
    drafts: [],
  };

  for (const generator of generators) {
    let sourceName = generator.name || "unknown-generator";
    try {
      const generated = await generator();
      sourceName = generated.sourceName || sourceName;

      for (const market of generated.markets) {
        if (!market.question || !market.closeTime || !market.resolutionRules) {
          result.skipped += 1;
          continue;
        }

        if (hasDatabaseUrl()) {
          const duplicate = await findDatabaseDuplicate(market);
          if (duplicate) {
            result.skipped += 1;
            continue;
          }
          result.drafts.push(toRecord(await createDatabaseDraft(market)));
        } else {
          if (findDevDuplicate(market)) {
            result.skipped += 1;
            continue;
          }
          result.drafts.push(createDevDraft(market));
        }
        result.created += 1;
      }
    } catch (error) {
      result.errored += 1;
      result.errors.push({
        sourceName,
        message: error instanceof Error ? error.message : "Unknown generator error",
      });
    }
  }

  console.info(
    `runMarketGenerators created=${result.created} skipped=${result.skipped} errored=${result.errored}`,
  );
  return result;
}
