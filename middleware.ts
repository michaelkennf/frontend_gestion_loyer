import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    /\.[a-zA-Z0-9]+$/.test(pathname);

  if (isStaticAsset) return NextResponse.next();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isAuthed = req.cookies.get("rent_auth")?.value === "1";
  const role = req.cookies.get("rent_role")?.value;

  if (!isPublic && !isAuthed) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (role === "ADMIN") {
    const allowedForAdmin = pathname.startsWith("/admin-users") || pathname.startsWith("/settings");
    if (!isPublic && !allowedForAdmin) {
      return NextResponse.redirect(new URL("/admin-users", req.url));
    }
  }
  if (pathname.startsWith("/admin-users") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};
