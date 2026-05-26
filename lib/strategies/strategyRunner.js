import { evaluateRules } from "./ruleEvaluator.js";
import { placeBet } from "../server/betService.js";
import { placeDemoBet, getDemoState } from "../server/demoStore.js";
import { hasDatabaseUrl } from "../server/prisma.js";
import { getDatabaseState } from "../server/dbState.js";

function betDraftForStake(stake) {
  return {
    stake,
    withdrawableShare: stake,
    bonusShare: 0,
  };
}

export async function runStrategyOnce({ strategy, userId }) {
  const isPaper = String(strategy.mode || "PAPER").toUpperCase() === "PAPER";
  const status = String(strategy.status || "DRAFT").toUpperCase();
  if (status !== "ACTIVE") {
    return {
      ok: false,
      isPaper,
      results: [],
      message: `Strategy is not ACTIVE (current status: ${strategy.status ?? "UNKNOWN"}).`,
    };
  }

  const cfg = strategy.config && typeof strategy.config === "object" ? strategy.config : {};
  const safety = cfg.safety && typeof cfg.safety === "object" ? cfg.safety : {};

  // Safety defaults are intentionally conservative for demo mode.
  const maxBetsPerRun = Math.max(
    1,
    Number(
      cfg.maxOpenBetsPerStrategy ??
        safety.maxOpenBetsPerStrategy ??
        cfg.maxActionsPerRun ??
        safety.maxActionsPerRun ??
        10,
    ),
  );
  const maxStakePerRun = Math.max(0, Number(cfg.maxStakePerRun ?? safety.maxStakePerRun ?? 0));
  const dedupeWindowMs = Math.max(0, Number(cfg.dedupeWindowMs ?? safety.dedupeWindowMs ?? 0));

  const actionDedupe =
    globalThis.__friendMarketStrategyActionDedupe ?? (globalThis.__friendMarketStrategyActionDedupe = new Map());
  const state = hasDatabaseUrl()
    ? await getDatabaseState(undefined, userId)
    : getDemoState(userId);

  const { actions } = evaluateRules({
    strategy,
    markets: state.markets || [],
    liveGames: state.liveGames || [],
  });

  const results = [];
  let totalStakePlaced = 0;
  let successfulBetCount = 0;
  const now = Date.now();

  for (const action of actions.slice(0, maxBetsPerRun)) {
    if (successfulBetCount >= maxBetsPerRun) break;

    const stake = Number(action.stake) || 0;
    if (stake <= 0) continue;

    let stakeToPlace = stake;
    if (maxStakePerRun > 0) {
      const remaining = maxStakePerRun - totalStakePlaced;
      if (remaining <= 0) break;
      stakeToPlace = Math.min(stakeToPlace, remaining);
      if (stakeToPlace <= 0) continue;
    }

    const dedupeKey = `${userId}:${strategy.id}:${action.marketId ?? "m"}:${action.side ?? "s"}`;
    const prior = dedupeWindowMs > 0 ? actionDedupe.get(dedupeKey) : null;
    if (prior && now - (prior.ts ?? 0) < dedupeWindowMs) {
      continue;
    }

    const betDraft = betDraftForStake(stakeToPlace);
    const databaseResult = await placeBet({
      marketId: action.marketId,
      side: action.side,
      betDraft,
      userId,
      isPaper,
    });
    const result =
      databaseResult ??
      placeDemoBet({
        marketId: action.marketId,
        side: action.side,
        betDraft,
        isPaper,
      });

    results.push({
      ok: result.ok,
      marketId: action.marketId,
      side: action.side,
      stake: stakeToPlace,
      message: result.message,
    });

    if (result?.ok) {
      successfulBetCount += 1;
      totalStakePlaced += stakeToPlace;
      if (dedupeWindowMs > 0) {
        actionDedupe.set(dedupeKey, { ts: Date.now() });
      }
    }
  }

  return { ok: true, isPaper, results };
}

