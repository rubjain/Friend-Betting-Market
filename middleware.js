import { NextResponse } from "next/server";

const SESSION_COOKIE = "agora-demo-session";

/**
 * Reads the role from the session cookie without Node crypto (Edge runtime).
 * The cookie is base64url(JSON).HMAC — we trust the payload for the redirect
 * decision only. All real admin authorization is enforced server-side in each
 * API route via requireAdmin / requireAdminPermission.
 */
function getSessionRole(request) {
  const raw = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const payload = raw.split(".")[0];
  if (!payload) return "user";
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json.role === "admin" ? "admin" : "user";
  } catch {
    return "user";
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const role = getSessionRole(request);
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/profile";
      url.searchParams.set("reason", "admin-required");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
