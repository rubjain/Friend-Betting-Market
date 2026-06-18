import assert from "node:assert/strict";
import test from "node:test";
import {
  countCompletedTennisSetsWon,
  extractTennisSnapshotFromCompetition,
  inferCompletedSetWinnerFromGames,
  mergeTennisSnapshots,
} from "../lib/tennisScoreboard.js";

test("extractTennisSnapshotFromCompetition maps scoreboard linescores and sets won", () => {
  const competition = {
    status: {
      period: 2,
      type: { detail: "Second Set · Sample serving", shortDetail: "2nd set" },
    },
    venue: { court: "Court 5" },
    round: { displayName: "Quarterfinal" },
    format: { regulation: { periods: 3 } },
    competitors: [
      {
        homeAway: "away",
        athlete: { displayName: "Away Player", shortName: "A. Away", id: "a1" },
        linescores: [{ value: 6, winner: true }, { value: 3 }],
        statistics: [],
      },
      {
        homeAway: "home",
        athlete: { displayName: "Home Player", shortName: "H. Home", id: "h1" },
        linescores: [{ value: 4 }, { value: 2 }],
        statistics: [],
      },
    ],
  };
  const snap = extractTennisSnapshotFromCompetition(competition, [1, 0]);
  assert.equal(snap.setsWon.away, 1);
  assert.equal(snap.setsWon.home, 0);
  assert.equal(snap.away.linescores.length, 2);
  assert.equal(snap.away.linescores[0].games, 6);
  assert.equal(snap.court, "Court 5");
});

test("countCompletedTennisSetsWon ignores in-progress set (e.g. 4–1 games)", () => {
  const away = { linescores: [{ value: 1 }] };
  const home = { linescores: [{ value: 4 }] };
  const [hs, as] = countCompletedTennisSetsWon(home, away);
  assert.equal(hs, 0);
  assert.equal(as, 0);
});

test("countCompletedTennisSetsWon counts 6–4 as one completed set when no winner flag", () => {
  const away = { linescores: [{ value: 4 }] };
  const home = { linescores: [{ value: 6 }] };
  const [hs, as] = countCompletedTennisSetsWon(home, away);
  assert.equal(hs, 1);
  assert.equal(as, 0);
});

test("inferCompletedSetWinnerFromGames", () => {
  assert.equal(inferCompletedSetWinnerFromGames(4, 1), null);
  assert.equal(inferCompletedSetWinnerFromGames(6, 4), "home");
  assert.equal(inferCompletedSetWinnerFromGames(4, 6), "away");
  assert.equal(inferCompletedSetWinnerFromGames(6, 5), null);
});

test("mergeTennisSnapshots prefers richer linescores and summary-only fields", () => {
  const sb = {
    setsWon: { away: 1, home: 1 },
    away: {
      linescores: [{ setIndex: 1, games: 6 }, { setIndex: 2, games: 4 }],
      pointsDisplay: null,
    },
    home: {
      linescores: [{ setIndex: 1, games: 4 }, { setIndex: 2, games: 5 }],
      pointsDisplay: null,
    },
    servingSide: "away",
  };
  const sum = {
    setsWon: { away: 1, home: 1 },
    away: { linescores: [{ setIndex: 1, games: 6 }], pointsDisplay: "40" },
    home: { linescores: [{ setIndex: 1, games: 4 }], pointsDisplay: "30" },
    servingSide: "home",
    lastPlayText: "Ace",
  };
  const m = mergeTennisSnapshots(sb, sum);
  assert.equal(m.away.linescores.length, 2);
  assert.equal(m.away.pointsDisplay, "40");
  assert.equal(m.servingSide, "home");
  assert.equal(m.lastPlayText, "Ace");
});
