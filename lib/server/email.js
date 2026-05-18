import nodemailer from "nodemailer";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const FROM = process.env.EMAIL_USER || "noreply@agora.app";

function createTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function sendVerificationEmail({ to, token, code }) {
  const link = `${APP_URL}/verify-email?token=${token}`;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[DEV] Verification code for ${to}: ${code}`);
    console.log(`[DEV] Verification link for ${to}: ${link}`);
    return;
  }

  const transporter = createTransport();
  await transporter.sendMail({
    from: `Agora <${FROM}>`,
    to,
    subject: "Your Agora verification code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="font-size:22px;font-weight:700;color:#e85d04">AG</span>
          <span style="font-size:16px;font-weight:600;color:#111;margin-left:8px">Agora</span>
        </div>
        <h2 style="font-size:20px;font-weight:700;color:#111;margin:0 0 8px">Verify your email</h2>
        <p style="color:#555;margin:0 0 28px">Enter this code in the app to activate your account:</p>
        <div style="background:#f5f5f5;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px">
          <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#111;font-family:monospace">${code}</span>
        </div>
        <p style="color:#555;font-size:14px;margin:0 0 8px">This code expires in 24 hours.</p>
        <p style="color:#888;font-size:13px;margin:0 0 24px">Or click the button below to verify automatically:</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#e85d04;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
          Verify email
        </a>
        <p style="color:#bbb;font-size:12px;margin:28px 0 0">If you didn't create an Agora account, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({ to, token }) {
  const link = `${APP_URL}/reset-password?token=${token}`;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[DEV] Password reset link for ${to}: ${link}`);
    return;
  }

  const transporter = createTransport();
  await transporter.sendMail({
    from: `Agora <${FROM}>`,
    to,
    subject: "Reset your Agora password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="font-size:22px;font-weight:700;color:#e85d04">AG</span>
          <span style="font-size:16px;font-weight:600;color:#111;margin-left:8px">Agora</span>
        </div>
        <h2 style="font-size:20px;font-weight:700;color:#111;margin:0 0 8px">Reset your password</h2>
        <p style="color:#555;margin:0 0 24px">Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#e85d04;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
          Reset password
        </a>
        <p style="color:#bbb;font-size:12px;margin:28px 0 0">If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}
