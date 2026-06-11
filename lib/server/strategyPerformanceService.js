import { hasDatabaseUrl, prisma } from "./prisma.js";

function toNumber(value) {
  return Number(value ?? 0);
}

function betPnl(bet) {
  const stake = toNumber(bet.stake);
  const status = String(bet.status || "").toUpperCase();
  if (status === "WON") {
    const multiplier = toNumber(bet.expectedMultiplier) >= 1.3 ? toNumber(bet.expectedMultiplier) : 2;
    return stake * multiplier - stake;
  }
  if (status === "LOST") return -stake;
  if (status === "SOLD") {
    const proceeds = stake * toNumber(bet.expectedMultiplier);
    return proceeds - stake;
  }
  if (status === "VOIDED" || status === "REFUNDED") return 0;
  return 0;
}

function computeDrawdownPct(pnlsByTime) {
  if (!pnlsByTime.length) return 0;
  let peak = 0;
  let cumulative = 0;
  let maxDrawdown = 0;
  for (const pnl of pnlsByTime) {
    cumulative += pnl;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  return Math.round(maxDrawdown * 100) / 100;
}

function summarizeBets(bets) {
  const settled = bets.filter((bet) => !["OPEN"].includes(String(bet.status || "").toUpperCase()));
  if (!settled.length) {
    return { roiPct: 0, winRatePct: 0, maxDrawdownPct: 0, totalStaked: 0, totalPnl: 0 };
  }

  const totalStaked = settled.reduce((sum, bet) => sum + toNumber(bet.stake), 0);
  const totalPnl = settled.reduce((sum, bet) => sum + betPnl(bet), 0);
  const wins = settled.filter((bet) => {
    const status = String(bet.status || "").toUpperCase();
    if (status === "WON") return true;
    if (status === "SOLD") return betPnl(bet) > 0;
    return false;
  }).length;
  const losses = settled.filter((bet) => {
    const status = String(bet.status || "").toUpperCase();
    if (status === "LOST") return true;
    if (status === "SOLD") return betPnl(bet) < 0;
    return false;
  }).length;
  const decided = wins + losses;
  const winRatePct = decided > 0 ? Math.round((wins / decided) * 10000) / 100 : 0;
  const roiPct = totalStaked > 0 ? Math.round((totalPnl / totalStaked) * 10000) / 100 : 0;

  const ordered = [...settled].sort((a, b) => {
    const aTime = new Date(a.settledAt || a.placedAt || 0).getTime();
    const bTime = new Date(b.settledAt || b.placedAt || 0).getTime();
    return aTime - bTime;
  });
  const maxDrawdownPct = computeDrawdownPct(ordered.map((bet) => betPnl(bet)));

  return { roiPct, winRatePct, maxDrawdownPct, totalStaked, totalPnl };
}

export async function computeProfilePerformance(profileId, { client = prisma } = {}) {
  if (!hasDatabaseUrl()) {
    return { roiPct: 0, winRatePct: 0, maxDrawdownPct: 0 };
  }

  const profile = await client.strategyMarketplaceProfile.findUnique({
    where: { id: profileId },
    select: { strategyId: true, creatorId: true },
  });
  if (!profile) return { roiPct: 0, winRatePct: 0, maxDrawdownPct: 0 };

  const signals = await client.strategyTradeSignal.findMany({
    where: { strategyId: profile.strategyId, sourceBetId: { not: null } },
    select: { sourceBetId: true },
  });
  const sourceBetIds = [...new Set(signals.map((signal) => signal.sourceBetId).filter(Boolean))];

  let creatorBets = [];
  if (sourceBetIds.length) {
    creatorBets = await client.bet.findMany({
      where: { id: { in: sourceBetIds }, userId: profile.creatorId, isPaper: true },
      select: { id: true, stake: true, status: true, expectedMultiplier: true, placedAt: true, settledAt: true },
    });
  }

  return summarizeBets(creatorBets);
}

export { betPnl, summarizeBets };
