import crypto from "node:crypto";

// Auth minimale mono-utilisateur : un seul mot de passe (APP_PASSWORD),
// et un cookie de session httpOnly signé HMAC-SHA256 (SESSION_SECRET).
// Aucun compte, aucune base : la session est entièrement dans le cookie signé.

export const SESSION_COOKIE = "gp_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours (secondes)

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "SESSION_SECRET manquant ou trop court (min 16 caractères).",
    );
  }
  return s;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** Jeton = `<émisMs>.<signatureHex>`. */
export function createSessionToken(): string {
  const issued = Date.now().toString();
  return `${issued}.${sign(issued)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const issued = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, sign(issued))) return false;
  const ageSec = (Date.now() - Number(issued)) / 1000;
  return Number.isFinite(ageSec) && ageSec >= 0 && ageSec <= SESSION_MAX_AGE;
}

export function verifyPassword(input: unknown): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected || typeof input !== "string") return false;
  return safeEqual(input, expected);
}
