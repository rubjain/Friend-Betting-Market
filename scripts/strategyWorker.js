import { listActiveStrategies, logStrategyExecution } from "../lib/server/strategyService.js";
import { runStrategyOnce } from "../lib/strategies/strategyRunner.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRunEveryMs(strategy) {
  const cfg = strategy.config && typeof strategy.config === "object" ? strategy.config : {};
  const schedule = cfg.schedule && typeof cfg.schedule === "object" ? cfg.schedule : {};
  const ms =
    schedule.runEveryMs ??
    cfg.runEveryMs ??
    schedule.intervalMs ??
    cfg.intervalMs ??
    60_000;
  const parsed = Number(ms);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
}

async function runOneTick({ strategies, lastRunAtByStrategyId }) {
  const now = Date.now();

  // Sequential execution keeps the demo predictable and avoids bursty ledger writes.
  for (const strategy of strategies) {
    const strategyId = strategy.id;
    const userId = strategy.userId;
    const intervalMs = getRunEveryMs(strategy);
    const lastRunAt = lastRunAtByStrategyId.get(strategyId);

    // If we’re not due yet, skip this strategy.
    if (lastRunAt && now - lastRunAt < intervalMs) continue;
    lastRunAtByStrategyId.set(strategyId, now);

    await logStrategyExecution({
      strategyId,
      userId,
      isPaper: String(strategy.mode).toUpperCase() === "PAPER",
      status: "STARTED",
      message: "Worker tick started.",
    });

    const result = await runStrategyOnce({ strategy, userId });

    await logStrategyExecution({
      strategyId,
      userId,
      isPaper: result.isPaper,
      status: result.ok ? "COMPLETED" : "FAILED",
      message: result.ok ? "Worker tick completed." : result.message,
      metadata: result,
    });

    // eslint-disable-next-line no-console
    console.log(
      `[strategyWorker] strategy=${strategyId} user=${userId} ok=${result.ok} results=${result.results?.length ?? 0}`,
    );
  }
}

async function main() {
  const once = process.argv.includes("--once");
  const pollMs = Number(process.env.STRATEGY_WORKER_POLL_MS ?? 10_000);
  const maxCycles = Number(process.env.STRATEGY_WORKER_MAX_CYCLES ?? 0); // 0 = infinite

  const lastRunAtByStrategyId = new Map();
  let cycles = 0;

  while (true) {
    const strategies = await listActiveStrategies();
    await runOneTick({ strategies, lastRunAtByStrategyId });
    cycles += 1;
    if (once) return;
    if (maxCycles > 0 && cycles >= maxCycles) return;
    await sleep(Number.isFinite(pollMs) && pollMs > 0 ? pollMs : 10_000);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[strategyWorker] fatal:", err);
  process.exitCode = 1;
});

