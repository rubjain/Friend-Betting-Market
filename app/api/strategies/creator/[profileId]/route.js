import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../../../lib/server/auth.js";
import { updateCreatorMarketplaceProfile } from "../../../../../lib/server/strategyMarketplaceService.js";

export async function PATCH(request, context) {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  const { profileId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await updateCreatorMarketplaceProfile({
    creatorId: auth.session.userId,
    profileId,
    patch: body,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
