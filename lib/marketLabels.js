/**
 * Contract button copy and chart legend labels for YES / NO outcomes.
 */
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
      yesLabel: linkedGame[`${pick}Team`],
      noLabel: linkedGame[`${other}Team`],
    };
  }
  return { yesLabel: "Yes", noLabel: "No" };
}
