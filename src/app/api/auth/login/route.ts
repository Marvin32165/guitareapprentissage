import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  let password: unknown = "";
  try {
    const body = await request.json();
    password = body?.password;
  } catch {
    // corps invalide → traité comme mot de passe vide
  }

  if (!verifyPassword(password)) {
    return NextResponse.json(
      { ok: false, error: "Mot de passe incorrect." },
      { status: 401 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}
