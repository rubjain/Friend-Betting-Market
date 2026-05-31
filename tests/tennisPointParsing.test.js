import assert from "node:assert/strict";
import test from "node:test";
import { parseGamePointsFromStatusText, sortTennisPointHistory } from "../lib/tennisPointParsing.js";

test("parseGamePointsFromStatusText reads away–home pair in text", () => {
  const p = parseGamePointsFromStatusText("Second set", "15–30");
  assert.deepEqual(p, { away: "15", home: "30" });
});

test("parseGamePointsFromStatusText reads parenthetical point line", () => {
  const p = parseGamePointsFromStatusText("In progress (40–AD)", "");
  assert.deepEqual(p, { away: "40", home: "AD" });
});

test("parseGamePointsFromStatusText deuce without pair returns 40–40", () => {
  const p = parseGamePointsFromStatusText("Deuce", "");
  assert.deepEqual(p, { away: "40", home: "40" });
});

test("sortTennisPointHistory orders desk ids high index first (older first in list)", () => {
  const plays = [
    { id: "desk-0", text: "newest", sequenceNumber: 0 },
    { id: "desk-2", text: "oldest", sequenceNumber: 0 },
    { id: "desk-1", text: "mid", sequenceNumber: 0 },
  ];
  const s = sortTennisPointHistory(plays);
  assert.equal(s[0].text, "oldest");
  assert.equal(s[1].text, "mid");
  assert.equal(s[2].text, "newest");
});

test("sortTennisPointHistory uses sequenceNumber when not desk", () => {
  const plays = [
    { id: "a", text: "second", sequenceNumber: 2, wallclock: null },
    { id: "b", text: "first", sequenceNumber: 1, wallclock: null },
  ];
  const s = sortTennisPointHistory(plays);
  assert.equal(s[0].text, "first");
  assert.equal(s[1].text, "second");
});
