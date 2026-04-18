import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { PORTAL_COOKIE, verifySession } from "@/lib/portal/session";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Portal pages — gated by session cookie. /portal/login is public.
  if (pathname.startsWith("/portal")) {
    if (pathname === "/portal/login") {
      return NextResponse.next();
    }
    const token = request.cookies.get(PORTAL_COOKIE)?.value;
    const session = token ? await verifySession(token) : null;
    if (!session) {
      const loginUrl = new URL("/portal/login", request.url);
      if (pathname !== "/portal") loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Portal APIs — also gated, except the login endpoint itself.
  if (pathname.startsWith("/api/portal")) {
    if (pathname === "/api/portal/login") {
      return NextResponse.next();
    }
    const token = request.cookies.get(PORTAL_COOKIE)?.value;
    const session = token ? await verifySession(token) : null;
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/",
    "/(fr|en)/:path*",
    "/portal/:path*",
    "/api/portal/:path*",
    "/((?!api|_next|_vercel|icon|apple-icon|portal|.*\\..*).*)",
  ],
};
