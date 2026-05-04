import { defaultState } from "./defaultState.js";

function cloneLiveGames() {
  if (typeof structuredClone === "function") {
    return structuredClone(defaultState.liveGames);
  }
  return JSON.parse(JSON.stringify(defaultState.liveGames));
}

/**
 * Live score payload for `/api/live/games`. Seeds from defaultState and refreshes clock / log lines
 * so polling feels alive. Swap this module for league APIs in production.
 */
export function getLiveGamesPayload(now = new Date()) {
  const games = cloneLiveGames();
  const seed = defaultState.liveGames.find((g) => g.id === "game_cavs_raptors");
  const cavs = games.find((g) => g.id === "game_cavs_raptors");
  if (cavs && cavs.status === "live") {
    cavs.lastUpdated = now.toISOString();
    const sec = 59 - (Math.floor(now.getTime() / 1000) % 60);
    const min = 5 + (Math.floor(now.getTime() / 52000) % 5);
    cavs.clock = `${min}:${String(sec).padStart(2, "0")}`;
    const stamp = now.toISOString().slice(11, 19);
    cavs.updates = [
      `${cavs.period} ${cavs.clock}: ${cavs.awayTeam} ${cavs.awayScore} at ${cavs.homeTeam} ${cavs.homeScore} · desk refresh ${stamp}Z.`,
      ...(seed?.updates ?? []).slice(0, 3),
    ];
  }

  return {
    generatedAt: now.toISOString(),
    games,
  };
}
