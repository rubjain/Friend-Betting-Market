import { NextResponse } from "next/server";
import { listActiveStrategies, logStrategyExecution } from "../../../../lib/server/strategyService.js";
import { hasDatabaseUrl } from "../../../../lib/server/prisma.js";
import { runStrategyOnce } from "../../../../lib/strategies/strategyRunner.js";

function authorized(request) {
  const secret = process.env.CRON_SECRET || process.env.AGORA_CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ ok: false, message: "Database not configured." }, { status: 400 });
  }

  const strategies = await listActiveStrategies();
  let completed = 0;
  let failed = 0;

  for (const strategy of strategies) {
    await logStrategyExecution({
      strategyId: strategy.id,
      userId: strategy.userId,
      isPaper: String(strategy.mode).toUpperCase() === "PAPER",
      status: "STARTED",
      message: "Cron worker tick started.",
    });

    const result = await runStrategyOnce({ strategy, userId: strategy.userId });
    await logStrategyExecution({
      strategyId: strategy.id,
      userId: strategy.userId,
      isPaper: result.isPaper,
      status: result.ok ? "COMPLETED" : "FAILED",
      message: result.ok ? "Cron worker tick completed." : result.message,
      metadata: result,
    });

    if (result.ok) completed += 1;
    else failed += 1;
  }

  return NextResponse.json({
    ok: true,
    message: "Strategy worker cron completed.",
    strategies: strategies.length,
    completed,
    failed,
  });
}
