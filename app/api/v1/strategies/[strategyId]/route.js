import { NextResponse } from "next/server";
import { requireApiKeyScopes, resolvePublicApiCaller } from "../../../../../lib/server/auth.js";
import { deleteStrategy, getStrategy, updateStrategy } from "../../../../../lib/server/strategyService.js";
import { inferV1ErrorCode } from "../../../../../lib/server/v1ErrorCodes.js";

function normalizeStatus(status) {
  const s = String(status || "").toUpperCase();
  if (!s) return undefined;
  // Allow only known statuses, but keep the API tolerant.
  if (["DRAFT", "ACTIVE", "PAUSED"].includes(s)) return s;
  return s;
}

export async function PATCH(request, context) {
  const caller = await resolvePublicApiCaller(request);
  if (!caller.ok) return caller.response;

  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, "manage:strategies");
  if (!scopeCheck.ok) return scopeCheck.response;

  const userId = caller.userId;
  const strategyId = context?.params?.strategyId;

  // Confirm ownership early for clearer error codes.
  const existing = await getStrategy({ userId, strategyId });
  if (!existing) {
    return NextResponse.json(
      { ok: false, message: "Strategy not found.", code: inferV1ErrorCode("Strategy not found.") },
      { status: 404 },
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const patch = {};
  if (body.name !== undefined) patch.name = String(body.name);
  if (body.type !== undefined) patch.type = String(body.type).toUpperCase();
  if (body.mode !== undefined) patch.mode = String(body.mode).toUpperCase();
  if (body.status !== undefined) patch.status = normalizeStatus(body.status);
  if (body.config !== undefined) patch.config = body.config;

  const result = await updateStrategy({ userId, strategyId, patch });
  if (!result?.ok) {
    return NextResponse.json(
      { ...result, code: inferV1ErrorCode(result?.message) },
      { status: 400 },
    );
  }
  return NextResponse.json(result, { status: 200 });
}

export async function DELETE(request, context) {
  const caller = await resolvePublicApiCaller(request);
  if (!caller.ok) return caller.response;

  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, "manage:strategies");
  if (!scopeCheck.ok) return scopeCheck.response;

  const userId = caller.userId;
  const strategyId = context?.params?.strategyId;

  const result = await deleteStrategy({ userId, strategyId });
  if (!result?.ok) {
    return NextResponse.json(
      { ...result, code: inferV1ErrorCode(result?.message) },
      { status: 404 },
    );
  }
  return NextResponse.json(result, { status: 200 });
}

