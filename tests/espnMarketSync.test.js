import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMarketData,
  moneylineToPrices,
  resultFromFinalScore,
} from "../lib/server/espnMarketSync.js";
import { lookupOddsPrices } from "../lib/server/oddsApiClient.js";

const scheduledNbaGame = {
  id: "espn_nba_401234567",
  espnEventId: "401234567",
  league: "NBA",
  status: "scheduled",
  startTime: "2026-06-20T02:00:00Z",
  awayTeam: "Los Angeles Lakers",
  awayAbbr: "LAL",
  homeTeam: "Boston Celtics",
  homeAbbr: "BOS",
  espnSummaryPath: "nba/game/_/gameId/401234567",
};

test("moneyline prices remove vig and keep YES as away team", () => {
  const prices = moneylineToPrices({ away: +130, home: -155 });

  assert.equal(prices.yesPrice, 0.417);
  assert.equal(prices.noPrice, 0.583);
  assert.equal(Math.round((prices.yesPrice + prices.noPrice) * 10000), 10000);
  assert.equal(moneylineToPrices({ away: null, home: -120 }), null);
});

test("final score resolution follows YES-away and NO-home convention", () => {
  assert.equal(resultFromFinalScore({ awayScore: 102, homeScore: 99 }), "YES");
  assert.equal(resultFromFinalScore({ awayScore: 88, homeScore: 91 }), "NO");
  assert.equal(resultFromFinalScore({ awayScore: 2, homeScore: 2 }), "VOID");
  assert.equal(resultFromFinalScore({ awayScore: 0, homeScore: 0 }), null);
  assert.equal(resultFromFinalScore({ awayScore: "TBD", homeScore: 0 }), null);
});

test("ESPN market data uses espn id, sports category, team labels, and odds fallback", async () => {
  const market = await buildMarketData({
    ...scheduledNbaGame,
    moneyline: { away: +110, home: -130 },
  });

  assert.equal(market.id, scheduledNbaGame.id);
  assert.equal(market.category, "NBA");
  assert.equal(market.title, "Los Angeles Lakers @ Boston Celtics");
  assert.equal(market.description.includes("YES = Los Angeles Lakers wins"), true);
  assert.equal(market.metadata.awayAbbr, "LAL");
  assert.equal(market.metadata.homeAbbr, "BOS");
  assert.equal(market.metadata.oddsSource, "espn_draftkings");
  assert.equal(market.yesPrice + market.noPrice, 1);
});

test("ESPN market data falls back to 50/50 when no odds source is available", async () => {
  const market = await buildMarketData({ ...scheduledNbaGame, moneyline: null });

  assert.equal(market.yesPrice, 0.5);
  assert.equal(market.noPrice, 0.5);
  assert.equal(market.metadata.oddsSource, "default");
});

test("Odds API lookup handles exact, reversed, and surname fallback matches", () => {
  const oddsMap = new Map([
    ["iga swiatek|coco gauff", { yesPrice: 0.67, noPrice: 0.33 }],
    ["away:alcaraz", { yesPrice: 0.58, noPrice: 0.42 }],
    ["home:sinner", { yesPrice: 0.61, noPrice: 0.39 }],
  ]);

  assert.deepEqual(lookupOddsPrices("Iga Swiatek", "Coco Gauff", oddsMap), {
    yesPrice: 0.67,
    noPrice: 0.33,
  });
  assert.deepEqual(lookupOddsPrices("Coco Gauff", "Iga Swiatek", oddsMap), {
    yesPrice: 0.33,
    noPrice: 0.67,
  });
  assert.deepEqual(lookupOddsPrices("Carlos Alcaraz", "Novak Djokovic", oddsMap), {
    yesPrice: 0.58,
    noPrice: 0.42,
  });
  assert.deepEqual(lookupOddsPrices("Daniil Medvedev", "Jannik Sinner", oddsMap), {
    yesPrice: 0.61,
    noPrice: 0.39,
  });
  assert.equal(lookupOddsPrices("Unknown Away", "Unknown Home", oddsMap), null);
});
