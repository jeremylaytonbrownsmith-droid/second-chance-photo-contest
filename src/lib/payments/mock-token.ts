import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The mock provider has no external service to hold session state, and
 * Vercel's serverless functions don't share memory between invocations —
 * so "session state" has to travel in the URL itself. This signs a small
 * JSON payload with HMAC-SHA256 so the mock checkout page can't be handed
 * a forged "this succeeded for $1,000,000" token.
 */

interface MockSessionPayload {
  amountCents: number;
  description: string;
  customerEmail?: string;
  metadata: Record<string, string>;
}

function secret(): string {
  const value = process.env.MOCK_PAYMENT_SECRET;
  if (!value) {
    throw new Error("MOCK_PAYMENT_SECRET is not set — required for the mock payment provider");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeMockSession(payload: MockSessionPayload): string {
  const json = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(json);
  return `${json}.${signature}`;
}

export function decodeMockSession(token: string): MockSessionPayload {
  const [json, signature] = token.split(".");
  if (!json || !signature) {
    throw new Error("Malformed mock payment token");
  }
  const expected = sign(json);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("Invalid mock payment token signature");
  }
  return JSON.parse(Buffer.from(json, "base64url").toString("utf8"));
}
