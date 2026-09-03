import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// Next 16 : le « middleware » s'appelle désormais `proxy` (runtime nodejs).
// Garde d'authentification : redirige vers /login si le cookie de session
// est absent ou invalide. Les assets statiques, le manifest, le SW et
// /api/auth/* sont exclus via le `matcher` ci-dessous.

const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authed = verifySessionToken(token);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!authed && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (authed && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Tout sauf : assets Next, icônes, échantillons audio, manifest, service
    // worker, favicon, et les endpoints d'authentification (login/logout).
    "/((?!_next/static|_next/image|favicon.ico|icons/|audio/|manifest.webmanifest|sw.js|api/auth).*)",
  ],
};
