import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { PORTAL_COOKIE, verifySession } from "@/lib/portal/session";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const localizedPortalMatch = pathname.match(/^\/(?:en|fr)(\/portal(?:\/.*)?)$/);

  if (localizedPortalMatch) {
    const portalUrl = new URL(localizedPortalMatch[1], request.url);
    portalUrl.search = request.nextUrl.search;
    return NextResponse.redirect(portalUrl);
  }

  if (pathname.startsWith("/portal")) {
    if (pathname === "/portal/login") {
      return NextResponse.next();
    }

    const token = request.cookies.get(PORTAL_COOKIE)?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      const loginUrl = new URL("/portal/login", request.url);
      if (pathname !== "/portal") {
        loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      }
      return NextResponse.redirect(loginUrl);
    }

    const [, , portalClient] = pathname.split("/");
    if (portalClient && portalClient !== session.client) {
      return NextResponse.redirect(
        new URL(`/portal/${session.client}`, request.url),
      );
    }

    return NextResponse.next();
  }

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
