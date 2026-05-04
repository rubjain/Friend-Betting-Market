/**
 * Contract button copy and chart legend labels for YES / NO outcomes.
 */

/** ESPN tennis rows use full athlete names; UI buttons use surname only. */
function isIndividualPlayerLiveGame(linkedGame) {
  return String(linkedGame?.id ?? "").startsWith("espn_tennis_");
}

function lastNameFromDisplayName(displayName) {
  const s = String(displayName ?? "").trim();
  if (!s) return "";
  const parts = s.split(/\s+/);
  return parts[parts.length - 1] || s;
}

function h2hSideDisplay(linkedGame, side) {
  const full = linkedGame[`${side}Team`];
  if (isIndividualPlayerLiveGame(linkedGame)) {
    return lastNameFromDisplayName(full);
  }
  return full;
}

export function getContractSideLabels(market, linkedGame) {
  const yes = market?.yesLabel?.trim();
  const no = market?.noLabel?.trim();
  if (yes && no) {
    return { yesLabel: yes, noLabel: no };
  }
  if (market?.h2h && linkedGame?.awayTeam && linkedGame?.homeTeam) {
    const pick = market.yesPicks === "home" ? "home" : "away";
    const other = pick === "home" ? "away" : "home";
    return {
      yesLabel: h2hSideDisplay(linkedGame, pick),
      noLabel: h2hSideDisplay(linkedGame, other),
    };
  }
  return { yesLabel: "Yes", noLabel: "No" };
}
