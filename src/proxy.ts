import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "@/lib/auth/constants";

// Next.js 16 renamed Middleware to Proxy. This file MUST stay at src/proxy.ts
// and the function MUST be named `proxy` (or be a default export). See:
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md

async function verifyToken(token: string) {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as { role?: string };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const pathname = request.nextUrl.pathname;

  // The matcher below scopes execution to admin surfaces only; this guard is
  // a defensive no-op for any matcher misconfiguration.
  if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/super-admin")) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);

  if (!payload?.role) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "session_expired");
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/super-admin") && payload.role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    pathname.startsWith("/dashboard") &&
    !["org_admin", "org_manager", "org_analyst", "super_admin"].includes(payload.role)
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/super-admin/:path*"],
};
