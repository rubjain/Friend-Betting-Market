import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../../lib/server/auth.js";

const DEPRECATED_TYPES = new Set(["identity", "location", "age", "sanctions"]);

export async function POST(request) {
  const { session, response } = await requireAuthenticated(request);
  if (response) return response;

  const payload = await request.json();
  const type = String(payload.type || "").toLowerCase();

  if (DEPRECATED_TYPES.has(type)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          type === "identity"
            ? "Use Settings → Compliance to submit identity verification."
            : type === "location"
              ? "Use Settings → Compliance to confirm your location."
              : "This verification type is completed automatically through identity verification.",
      },
      { status: 410 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      message: "This demo verification endpoint is deprecated. Complete verification in Settings → Compliance.",
    },
    { status: 410 },
  );
}
