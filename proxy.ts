import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/server/session-options";

export function proxy(request: NextRequest) {
  const authenticated = request.cookies.has(SESSION_COOKIE_NAME);
  if (!authenticated && request.nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (authenticated && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
