import { NextResponse } from "next/server";
import { getBetaLaunchChecks } from "../../../lib/server/betaRuntime.js";
import { hasDatabaseUrl, prisma } from "../../../lib/server/prisma.js";

async function databaseStatus() {
  if (!hasDatabaseUrl()) {
    return { ok: false, configured: false };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, configured: true };
  } catch {
    return { ok: false, configured: true };
  }
}

export async function GET() {
  const launch = getBetaLaunchChecks();
  const database = await databaseStatus();
  const ok = launch.ready && (!launch.publicBeta || database.ok);

  return NextResponse.json(
    {
      ok,
      service: "agora",
      mode: launch.mode,
      database,
      provider: launch.provider,
      checks: launch.checks,
      generatedAt: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
