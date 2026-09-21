import { z } from "zod";

/**
 * Pure pricing/vote-package math — no I/O, exhaustively tested, built
 * before any CRUD or checkout UI around it (see CLAUDE.md build order).
 */

export interface VotePackage {
  votes: number;
  priceCents: number;
}

const votePackageSchema = z.object({
  votes: z.number().int().positive(),
});

const MAX_CUSTOM_VOTES = 10_000;

export function centsForVotes(votes: number, votePriceCents: number): number {
  if (!Number.isInteger(votes) || votes <= 0) {
    throw new RangeError(`votes must be a positive integer, got ${votes}`);
  }
  if (!Number.isInteger(votePriceCents) || votePriceCents <= 0) {
    throw new RangeError(`votePriceCents must be a positive integer, got ${votePriceCents}`);
  }
  return votes * votePriceCents;
}

/** Turns the admin-configured JSON blob into priced packages. Prices are
 * always derived from the current votePriceCents, never stored per-package
 * — so changing the per-vote price in admin repriced every package
 * automatically instead of needing each one hand-edited. */
export function parseVotePackages(json: unknown, votePriceCents: number): VotePackage[] {
  const raw = z.array(votePackageSchema).parse(json);
  return raw.map((p) => ({ votes: p.votes, priceCents: centsForVotes(p.votes, votePriceCents) }));
}

export type CustomVoteValidation = { ok: true; priceCents: number } | { ok: false; error: string };

export function validateCustomVoteCount(votes: number, votePriceCents: number): CustomVoteValidation {
  if (!Number.isInteger(votes)) {
    return { ok: false, error: "Enter a whole number of votes." };
  }
  if (votes <= 0) {
    return { ok: false, error: "Enter at least 1 vote." };
  }
  if (votes > MAX_CUSTOM_VOTES) {
    return { ok: false, error: `Enter ${MAX_CUSTOM_VOTES.toLocaleString()} votes or fewer.` };
  }
  return { ok: true, priceCents: centsForVotes(votes, votePriceCents) };
}

export interface GoalProgress {
  percent: number; // 0–100, clamped
  remainingCents: number; // never negative
}

export function goalProgress(raisedCents: number, goalCents: number): GoalProgress {
  if (goalCents <= 0) {
    return { percent: raisedCents > 0 ? 100 : 0, remainingCents: 0 };
  }
  const percent = Math.min(100, Math.max(0, (raisedCents / goalCents) * 100));
  const remainingCents = Math.max(0, goalCents - raisedCents);
  return { percent, remainingCents };
}
