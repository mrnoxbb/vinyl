import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedRoutes = new Set(["/", "/diary", "/lists", "/notifications"]);
const publicPrefixes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/search",
  "/explore",
  "/item/",
  "/user/"
];

function isPublicRoute(pathname: string): boolean {
  return publicPrefixes.some((prefix) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix
  );
}

function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => {
    if (!cookie.value) {
      return false;
    }

    return (
      cookie.name === "sb-access-token" ||
      cookie.name.endsWith("-access-token") ||
      (cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"))
    );
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!protectedRoutes.has(pathname) || isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (hasSupabaseSession(request)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
