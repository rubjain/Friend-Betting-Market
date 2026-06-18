const SETTLED_WIN_STATUSES = new Set(["WON", "LOST"]);
const PUSH_STATUSES = new Set(["VOIDED", "REFUNDED"]);

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function byMarket(bets) {
  const map = new Map();
  for (const bet of bets) {
    if (!bet?.marketId) continue;
    const existing = map.get(bet.marketId);
    if (!existing || new Date(bet.placedAt || 0) > new Date(existing.placedAt || 0)) {
      map.set(bet.marketId, bet);
    }
  }
  return map;
}

function matchupBadge(status) {
  if (status === "WON") return "W";
  if (status === "LOST") return "L";
  if (PUSH_STATUSES.has(status)) return "P";
  return "O";
}

export function getHeadToHeadStats(myBets = [], friendBets = []) {
  const friendBetsByMarket = byMarket(friendBets);
  const matchups = [...byMarket(myBets).values()]
    .map((mine) => {
      const theirs = friendBetsByMarket.get(mine.marketId);
      if (!theirs || mine.side === theirs.side) return null;
      return {
        mine,
        theirs,
        marketId: mine.marketId,
        title: mine.market?.title || mine.title || "Market",
        placedAt: mine.placedAt,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.placedAt || 0) - new Date(a.placedAt || 0));

  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let open = 0;
  let stakeAtRisk = 0;
  let netAmount = 0;

  for (const { mine } of matchups) {
    const stake = numeric(mine.stake);
    if (mine.status === "WON") {
      wins++;
      netAmount += stake * (numeric(mine.expectedMultiplier) - 1);
    } else if (mine.status === "LOST") {
      losses++;
      netAmount -= stake;
    } else if (PUSH_STATUSES.has(mine.status)) {
      pushes++;
    } else {
      open++;
      stakeAtRisk += stake;
    }
  }

  const settled = wins + losses;
  const total = settled + pushes + open;

  return {
    record: { wins, losses, pushes, open },
    summary: {
      total,
      settled,
      winRate: settled ? Math.round((wins / settled) * 100) : 0,
      open,
      stakeAtRisk: Math.round(stakeAtRisk * 100) / 100,
    },
    netAmount: Math.round(netAmount * 100) / 100,
    recentMatchups: matchups.slice(0, 5).map(({ mine, theirs, marketId, title, placedAt }) => ({
      marketId,
      title,
      placedAt: placedAt instanceof Date ? placedAt.toISOString() : new Date(placedAt || Date.now()).toISOString(),
      mySide: mine.side,
      myStatus: mine.status,
      myBadge: matchupBadge(mine.status),
      friendSide: theirs.side,
      friendStatus: theirs.status,
    })),
  };
}
