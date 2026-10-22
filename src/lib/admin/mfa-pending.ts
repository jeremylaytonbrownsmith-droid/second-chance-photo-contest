import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Two short-lived signed cookies that carry state between the password
 * step and the passkey step of admin login:
 *
 * - admin_mfa_pending: "this browser already proved the password for
 *   adminUserId" — set once, right after a correct password, read by both
 *   the passkey-options and passkey-verify endpoints.
 * - admin_webauthn_challenge: the random challenge handed out by
 *   generateRegistrationOptions/generateAuthenticationOptions, which the
 *   matching verify call needs back to confirm the browser signed *this*
 *   challenge and not a replayed one.
 *
 * Both reuse ADMIN_SESSION_SECRET (same HMAC approach as the real session
 * cookie in session.ts) rather than requiring yet another env var.
 */

export const ADMIN_MFA_PENDING_COOKIE = "admin_mfa_pending";
export const ADMIN_WEBAUTHN_CHALLENGE_COOKIE = "admin_webauthn_challenge";
const PENDING_TTL_MS = 5 * 60 * 1000;

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

function encode(payload: object): string {
  const json = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${json}.${sign(json)}`;
}

function decode<T>(token: string | undefined | null): T | null {
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
    return JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

interface MfaPendingPayload {
  adminUserId: string;
  expiresAt: number;
}

export function createMfaPendingToken(adminUserId: string): string {
  return encode({ adminUserId, expiresAt: Date.now() + PENDING_TTL_MS } satisfies MfaPendingPayload);
}

export function verifyMfaPendingToken(token: string | undefined | null): string | null {
  const payload = decode<MfaPendingPayload>(token);
  if (!payload || payload.expiresAt < Date.now()) return null;
  return payload.adminUserId;
}

interface ChallengePayload {
  challenge: string;
  expiresAt: number;
}

export function createChallengeToken(challenge: string): string {
  return encode({ challenge, expiresAt: Date.now() + PENDING_TTL_MS } satisfies ChallengePayload);
}

export function verifyChallengeToken(token: string | undefined | null): string | null {
  const payload = decode<ChallengePayload>(token);
  if (!payload || payload.expiresAt < Date.now()) return null;
  return payload.challenge;
}

export const PENDING_COOKIE_MAX_AGE_SECONDS = PENDING_TTL_MS / 1000;
