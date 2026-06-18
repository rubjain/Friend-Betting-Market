import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../lib/server/auth.js";
import { listMarketplaceProfiles } from "../../../lib/server/strategyMarketplaceService.js";

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  const allProfiles = await listMarketplaceProfiles({
    userId: session.authenticated ? session.userId : undefined,
  });
  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get("q") || "").toLowerCase().trim();
  const risk = String(searchParams.get("risk") || "all");
  const sort = String(searchParams.get("sort") || "subscribers");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || 20)));
  const filtered = allProfiles
    .filter((profile) => (risk === "all" ? true : profile.riskLevel === risk))
    .filter((profile) => (!q ? true : `${profile.name} ${profile.description} ${profile.creator?.username || ""}`.toLowerCase().includes(q)))
    .sort((a, b) => {
      if (sort === "roi") return (b.roiPct ?? 0) - (a.roiPct ?? 0);
      if (sort === "volume") return (b.copiedVolume ?? 0) - (a.copiedVolume ?? 0);
      if (sort === "price") return (a.priceCents ?? 0) - (b.priceCents ?? 0);
      return (b.subscriberCount ?? 0) - (a.subscriberCount ?? 0);
    });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const profiles = filtered.slice(start, start + pageSize);
  return NextResponse.json({
    ok: true,
    profiles,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
