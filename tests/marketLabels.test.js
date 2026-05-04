import assert from "node:assert/strict";
import test from "node:test";
import { getContractSideLabels } from "../lib/marketLabels.js";

test("h2h tennis uses last names on YES/NO buttons", () => {
  const game = {
    id: "espn_tennis_atp_999",
    awayTeam: "Carlos Alcaraz",
    homeTeam: "Jannik Sinner",
    awayAbbr: "Alcaraz",
    homeAbbr: "Sinner",
  };
  const market = { h2h: true, yesPicks: "away" };
  const { yesLabel, noLabel } = getContractSideLabels(market, game);
  assert.equal(yesLabel, "Alcaraz");
  assert.equal(noLabel, "Sinner");
});

test("h2h team sports keep full team names", () => {
  const game = {
    id: "espn_nba_1",
    awayTeam: "Toronto Raptors",
    homeTeam: "Cleveland Cavaliers",
    awayAbbr: "TOR",
    homeAbbr: "CLE",
  };
  const market = { h2h: true, yesPicks: "away" };
  const { yesLabel, noLabel } = getContractSideLabels(market, game);
  assert.equal(yesLabel, "Toronto Raptors");
  assert.equal(noLabel, "Cleveland Cavaliers");
});

test("explicit yes/no labels still win", () => {
  const game = { id: "espn_tennis_atp_1", awayTeam: "A", homeTeam: "B" };
  const market = { h2h: true, yesLabel: "Custom Yes", noLabel: "Custom No" };
  assert.deepEqual(getContractSideLabels(market, game), {
    yesLabel: "Custom Yes",
    noLabel: "Custom No",
  });
});
