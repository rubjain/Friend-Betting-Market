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

test("h2h team sports keep full team names by default", () => {
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

test("h2h team sports use abbreviations when shortSides", () => {
  const game = {
    id: "espn_nba_1",
    awayTeam: "Toronto Raptors",
    homeTeam: "Cleveland Cavaliers",
    awayAbbr: "TOR",
    homeAbbr: "CLE",
  };
  const market = { h2h: true, yesPicks: "away" };
  assert.deepEqual(getContractSideLabels(market, game, { shortSides: true }), {
    yesLabel: "TOR",
    noLabel: "CLE",
  });
});

test("h2h tennis can use provider abbreviations when shortSides", () => {
  const game = {
    id: "espn_tennis_atp_999",
    awayTeam: "Carlos Alcaraz",
    homeTeam: "Jannik Sinner",
    awayAbbr: "ALC",
    homeAbbr: "SIN",
  };
  const market = { h2h: true, yesPicks: "home" };
  assert.deepEqual(getContractSideLabels(market, game, { shortSides: true }), {
    yesLabel: "SIN",
    noLabel: "ALC",
  });
});

test("h2h team sports fall back to full names when abbreviation missing but shortSides", () => {
  const game = {
    id: "espn_nba_2",
    awayTeam: "Boston Celtics",
    homeTeam: "New York Knicks",
  };
  const market = { h2h: true, yesPicks: "home" };
  const { yesLabel, noLabel } = getContractSideLabels(market, game, { shortSides: true });
  assert.equal(yesLabel, "New York Knicks");
  assert.equal(noLabel, "Boston Celtics");
});

test("explicit yes/no labels still win", () => {
  const game = { id: "espn_tennis_atp_1", awayTeam: "A", homeTeam: "B" };
  const market = { h2h: true, yesLabel: "Custom Yes", noLabel: "Custom No" };
  assert.deepEqual(getContractSideLabels(market, game), {
    yesLabel: "Custom Yes",
    noLabel: "Custom No",
  });
});

test("explicit long labels compress with shortSides", () => {
  const game = null;
  const market = {
    yesLabel: "Will the total score exceed forty five points",
    noLabel: "No the total stays under forty five points",
  };
  const labels = getContractSideLabels(market, game, { shortSides: true });
  assert.equal(labels.yesLabel, "total score exceed");
  assert.equal(labels.noLabel, "total stays under");
});
