import { NextResponse } from "next/server";
import { hasDatabaseUrl, prisma } from "../../../../../lib/server/prisma.js";

// Number of points to return per window
const WINDOW_CONFIGS = {
  "1d": { ms: 24 * 60 * 60 * 1000, limit: 120 },
  "7d": { ms: 7 * 24 * 60 * 60 * 1000, limit: 200 },
  "30d": { ms: 30 * 24 * 60 * 60 * 1000, limit: 200 },
  all: { ms: null, limit: 300 },
};

export async function GET(request, { params: rawParams }) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ snapshots: [] });
  }

  const params = await rawParams;
  const { marketId } = params;
  const url = new URL(request.url);
  const window = url.searchParams.get("window") || "7d";
  const config = WINDOW_CONFIGS[window] ?? WINDOW_CONFIGS["7d"];

  const where = { marketId };
  if (config.ms) {
    where.createdAt = { gte: new Date(Date.now() - config.ms) };
  }

  // Always include the very first snapshot (market open) regardless of window
  const [firstSnapshot, windowSnapshots] = await Promise.all([
    prisma.oddsSnapshot.findFirst({
      where: { marketId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.oddsSnapshot.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: config.limit,
    }),
  ]);

  // Merge first snapshot with window snapshots (deduplicate by id)
  const allIds = new Set(windowSnapshots.map((s) => s.id));
  const snapshots = [
    ...(firstSnapshot && !allIds.has(firstSnapshot.id) ? [firstSnapshot] : []),
    ...windowSnapshots,
  ];

  return NextResponse.json({
    snapshots: snapshots.map((s) => ({
      t: s.createdAt.getTime(),
      y: Number(s.yesPrice),
      n: Number(s.noPrice),
    })),
  });
}
