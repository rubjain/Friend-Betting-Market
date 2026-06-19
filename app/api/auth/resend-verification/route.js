import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/server/prisma.js";
import { createAuthToken, RATE_LIMITS, checkRateLimit, rateLimitMessage } from "../../../../lib/server/authSecurity.js";
import { sendVerificationEmail } from "../../../../lib/server/email.js";
import { createEmailVerificationCode } from "../../../../lib/server/auth.js";

function getRequestRateLimitKey(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const clientIp = forwardedFor.split(",")[0].trim();
  return clientIp || request.headers.get("x-real-ip") || "local";
}

export async function POST(request) {
  try {
    const { email } = await request.json();
    const cleaned = String(email || "").trim().toLowerCase();
    const limit = await checkRateLimit({
      scope: "resendVerification",
      identifier: cleaned,
      requestKey: getRequestRateLimitKey(request),
      config: RATE_LIMITS.resendVerification,
    });
    if (!limit.ok) {
      return NextResponse.json({ ok: false, message: rateLimitMessage(limit) }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email: cleaned } });

    if (user) {
      const emailCheck = await prisma.verificationCheck.findUnique({
        where: { userId_type: { userId: user.id, type: "EMAIL" } },
      });
      if (emailCheck?.status === "PENDING") {
        const code = createEmailVerificationCode();
        const token = await createAuthToken({
          userId: user.id,
          type: "EMAIL_VERIFICATION",
          metadata: { email: cleaned, code },
        });
        sendVerificationEmail({ to: cleaned, token: token.token, code }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, message: "If that account exists and is unverified, a new code has been sent." });
  } catch {
    return NextResponse.json({ ok: true, message: "If that account exists and is unverified, a new code has been sent." });
  }
}
