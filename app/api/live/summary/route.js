import { NextResponse } from "next/server";
import { normalizeEspnSummaryPlays, normalizeNbaPlayerBoxFromSummary } from "../../../../lib/espnSummaryNormalize.js";

const LEAGUE_PATH = {
  nba: "basketball/nba",
  nfl: "football/nfl",
  mlb: "baseball/mlb",
  nhl: "hockey/nhl",
};

export async function GET(request) {
  const url = new URL(request.url);
  const event = url.searchParams.get("event");
  const pathOverride = url.searchParams.get("path");
  const leagueKey = (url.searchParams.get("league") || "nba").toLowerCase();
  if (!event) {
    return NextResponse.json({ error: "Missing event", plays: [] }, { status: 400 });
  }

  let sportsPath = pathOverride?.trim();
  if (!sportsPath) {
    sportsPath = LEAGUE_PATH[leagueKey];
  }
  if (!sportsPath) {
    return NextResponse.json({ error: "Unsupported league", plays: [] }, { status: 400 });
  }

  const upstream = `https://site.api.espn.com/apis/site/v2/sports/${sportsPath}/summary?event=${encodeURIComponent(event)}`;
  try {
    const res = await fetch(upstream, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { plays: [], generatedAt: new Date().toISOString(), feedError: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const json = await res.json();
    const leagueUpper = pathOverride
      ? "SOCCER"
      : leagueKey === "nba"
        ? "NBA"
        : leagueKey === "nfl"
          ? "NFL"
          : leagueKey === "nhl"
            ? "NHL"
            : "MLB";
    const plays = normalizeEspnSummaryPlays(json, leagueUpper);
    const playerBox = leagueUpper === "NBA" ? normalizeNbaPlayerBoxFromSummary(json) : null;
    return NextResponse.json(
      {
        plays,
        playerBox,
        generatedAt: new Date().toISOString(),
        league: leagueKey,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { plays: [], generatedAt: new Date().toISOString(), feedError: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
