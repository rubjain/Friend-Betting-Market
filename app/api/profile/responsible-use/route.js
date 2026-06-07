import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../lib/server/auth.js";
import { updateResponsibleUseSettings } from "../../../lib/server/responsibleUseService.js";

export async function PATCH(request) {
  const { session, response } = await requireAuthenticated(request);
  if (response) return response;

  const payload = await request.json();
  const result = await updateResponsibleUseSettings({
    userId: session.userId,
    dailyDepositLimit: payload.dailyDepositLimit,
    selfExcludedDays: payload.selfExcludedDays,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
