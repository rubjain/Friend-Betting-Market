import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "agora-demo-session";

function sessionLooksAdmin(request) {
  const value = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!value || !value.includes(".")) {
    return false;
  }

  try {
    const [payload] = value.split(".");
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const parsed = JSON.parse(atob(padded));
    return parsed.role === "admin";
  } catch {
    return false;
  }
}

export default function proxy(request) {
  if (request.nextUrl.pathname === "/admin" && !sessionLooksAdmin(request)) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin"],
};
