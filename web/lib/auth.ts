import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE_NAME = "ppgscope_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getAuthSecret(): string | null {
  const secret = process.env.PPGSCOPE_AUTH_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionToken(now = Math.floor(Date.now() / 1000)): string | null {
  const secret = getAuthSecret();
  if (!secret) return null;

  const payload = `${now + SESSION_TTL_SECONDS}.${randomBytes(16).toString("hex")}`;
  return `${encode(payload)}.${sign(payload, secret)}`;
}

export function isValidSessionToken(token: string | undefined, now = Math.floor(Date.now() / 1000)): boolean {
  if (!token) return false;
  const secret = getAuthSecret();
  if (!secret) return false;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return false;
  }

  const [expiry] = payload.split(".");
  const expirySeconds = Number(expiry);
  if (!Number.isSafeInteger(expirySeconds) || expirySeconds <= now) return false;

  return safeEqual(signature, sign(payload, secret));
}

export function isAuthenticated(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1);

  return isValidSessionToken(token);
}

export function verifyPassword(password: unknown): boolean {
  const expected = process.env.PPGSCOPE_AUTH_PASSWORD;
  if (typeof password !== "string" || !expected) return false;
  return safeEqual(password, expected);
}

export const SESSION_TTL = SESSION_TTL_SECONDS;
