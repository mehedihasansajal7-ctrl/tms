import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "./lib/auth";

function isPassthrough(pathname: string) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  );
}

function homeFor(s: { role: string; kind: string }): string {
  if (s.role === "ADMIN") return "/admin";
  if (s.kind === "driver") return "/driver";
  return "/dashboard";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPassthrough(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (pathname === "/login" || pathname === "/forgot-password" || pathname === "/reset-password") {
    if (session) return NextResponse.redirect(new URL(homeFor(session), request.url));
    return NextResponse.next();
  }

  if (pathname === "/") {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.redirect(new URL(homeFor(session), request.url));
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
