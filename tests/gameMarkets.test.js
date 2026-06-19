import assert from "node:assert/strict";
import test from "node:test";
import {
  filterGamesForScoreRail,
  getGameMarketCategory,
  getLiveGameNavPath,
  getMarketForLiveGame,
  mergeGameMarkets,
} from "../lib/gameMarkets.js";

test("getGameMarketCategory maps ESPN prefixes", () => {
  assert.equal(getGameMarketCategory({ id: "espn_nba_123", league: "NBA" }), "NBA");
  assert.equal(getGameMarketCategory({ id: "espn_tennis_atp_456", league: "ATP · X" }), "Tennis");
  assert.equal(getGameMarketCategory({ id: "espn_soccer_mex.1_789", league: "Liga MX" }), "Soccer");
  assert.equal(getGameMarketCategory({ id: "espn_nhl_1", league: "NHL" }), "NHL");
});

test("filterGamesForScoreRail respects category tab", () => {
  const games = [
    { id: "espn_nba_a", league: "NBA", status: "live", startTime: "2026-05-03T20:00:00Z" },
    { id: "espn_nhl_b", league: "NHL", status: "scheduled", startTime: "2026-05-03T21:00:00Z" },
  ];
  const nbaOnly = filterGamesForScoreRail(games, "NBA");
  assert.equal(nbaOnly.length, 1);
  assert.equal(nbaOnly[0].id, "espn_nba_a");
});

test("mergeGameMarkets skips games already linked by seeded markets", async () => {
  const { defaultState } = await import("../lib/defaultState.js");
  const merged = mergeGameMarkets(defaultState.markets, defaultState.liveGames);
  assert.equal(merged.length >= defaultState.markets.length, true);
});

test("getMarketForLiveGame and getLiveGameNavPath prefer merged market href", async () => {
  const { defaultState } = await import("../lib/defaultState.js");
  const merged = mergeGameMarkets(defaultState.markets, defaultState.liveGames);
  const game = defaultState.liveGames.find((g) => g.id === "game_cavs_raptors");
  assert.ok(game);
  const m = getMarketForLiveGame(game, merged);
  assert.ok(m);
  assert.equal(getLiveGameNavPath(game, merged), `/markets/${m.id}`);
  assert.equal(getLiveGameNavPath({ id: "orphan_game_xyz" }, merged), "/live/orphan_game_xyz");
});
