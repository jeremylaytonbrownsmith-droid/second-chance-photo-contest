import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing for AdminUser — scrypt via Node's built-in crypto
 * (same "no new dependency, Node's own primitives" approach as the mock
 * payment token signing) rather than pulling in bcrypt/argon2.
 */

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const candidateBuf = scryptSync(password, salt, KEY_LENGTH);
  return hashBuf.length === candidateBuf.length && timingSafeEqual(hashBuf, candidateBuf);
}
