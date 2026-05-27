import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";
import { createApiKey, listApiKeys, revokeApiKey } from "../../../../lib/server/apiKeyService.js";
import { inferV1ErrorCode } from "../../../../lib/server/v1ErrorCodes.js";
import { betaRuntimeError } from "../../../../lib/server/betaRuntime.js";

export async function GET(request) {
  const runtimeError = betaRuntimeError();
  if (runtimeError) return NextResponse.json(runtimeError, { status: 503 });

  const session = await getSessionFromRequest(request);
  if (!session.authenticated) {
    return NextResponse.json(
      { ok: false, message: "Not authenticated.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const keys = await listApiKeys(session.userId);
  return NextResponse.json({ ok: true, keys });
}

export async function POST(request) {
  const runtimeError = betaRuntimeError();
  if (runtimeError) return NextResponse.json(runtimeError, { status: 503 });

  const session = await getSessionFromRequest(request);
  if (!session.authenticated) {
    return NextResponse.json(
      { ok: false, message: "Not authenticated.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const result = await createApiKey({
    userId: session.userId,
    name: body.name,
    scopes: body.scopes,
  });

  if (!result?.ok) {
    return NextResponse.json(
      { ...result, code: inferV1ErrorCode(result?.message) },
      { status: 400 },
    );
  }

  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(request) {
  const runtimeError = betaRuntimeError();
  if (runtimeError) return NextResponse.json(runtimeError, { status: 503 });

  const session = await getSessionFromRequest(request);
  if (!session.authenticated) {
    return NextResponse.json(
      { ok: false, message: "Not authenticated.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const apiKeyId = body.apiKeyId;
  if (!apiKeyId) {
    return NextResponse.json(
      { ok: false, message: "Missing apiKeyId.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const result = await revokeApiKey({ userId: session.userId, apiKeyId });
  if (!result?.ok) {
    return NextResponse.json(
      { ...result, code: inferV1ErrorCode(result?.message) },
      { status: 400 },
    );
  }

  return NextResponse.json(result, { status: 200 });
}

