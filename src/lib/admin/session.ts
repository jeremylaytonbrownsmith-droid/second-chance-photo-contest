import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Admin session cookie — HMAC-signed, same shape as the mock payment
 * token's signing (src/lib/payments/mock-token.ts): a JSON payload plus a
 * signature, so a session can't be forged without ADMIN_SESSION_SECRET.
 */

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

interface SessionPayload {
  adminUserId: string;
  expiresAt: number;
}

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) {
    throw new Error("ADMIN_SESSION_SECRET is not set — required for admin login");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(adminUserId: string): string {
  const payload: SessionPayload = { adminUserId, expiresAt: Date.now() + SESSION_TTL_MS };
  const json = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${json}.${sign(json)}`;
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [json, signature] = token.split(".");
  if (!json || !signature) return null;

  const expected = sign(json);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(json, "base64url").toString("utf8"));
    if (payload.expiresAt < Date.now()) return null;
    return payload.adminUserId;
  } catch {
    return null;
  }
}
