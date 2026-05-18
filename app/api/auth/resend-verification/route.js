import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/server/prisma.js";
import { createAuthToken } from "../../../../lib/server/authSecurity.js";
import { sendVerificationEmail } from "../../../../lib/server/email.js";

export async function POST(request) {
  try {
    const { email } = await request.json();
    const cleaned = String(email || "").trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleaned } });

    if (user) {
      const emailCheck = await prisma.verificationCheck.findUnique({
        where: { userId_type: { userId: user.id, type: "EMAIL" } },
      });
      if (emailCheck?.status === "PENDING") {
        const token = await createAuthToken({
          userId: user.id,
          type: "EMAIL_VERIFICATION",
          metadata: { email: cleaned },
        });
        sendVerificationEmail({ to: cleaned, token: token.token }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, message: "If that account exists and is unverified, a new link has been sent." });
  } catch {
    return NextResponse.json({ ok: true, message: "If that account exists and is unverified, a new link has been sent." });
  }
}
