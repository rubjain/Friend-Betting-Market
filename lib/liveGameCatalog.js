import { defaultState } from "./defaultState.js";
import { fetchEspnLiveGames } from "./espnLiveGames.js";

function cloneLiveGames() {
  if (typeof structuredClone === "function") {
    return structuredClone(defaultState.liveGames);
  }
  return JSON.parse(JSON.stringify(defaultState.liveGames));
}

/**
 * Demo scoreboard when ESPN is unavailable or disabled (`FRIENDMARKET_DISABLE_ESPN=1`).
 */
export function getDemoLiveGamesPayload(now = new Date()) {
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
    feedSource: "demo",
  };
}

/**
 * Live score payload for `/api/live/games`. Uses ESPN's public scoreboard API when possible,
 * otherwise the seeded demo board.
 */
export async function getLiveGamesPayload(now = new Date()) {
  try {
    const remote = await fetchEspnLiveGames(now, { signal: AbortSignal.timeout(60_000) });
    if (remote.length > 0) {
      return {
        generatedAt: now.toISOString(),
        games: remote,
        feedSource: "espn",
      };
    }
  } catch {
    /* fall through */
  }

  return getDemoLiveGamesPayload(now);
}
