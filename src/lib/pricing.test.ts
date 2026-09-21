import { describe, expect, it } from "vitest";
import {
  centsForVotes,
  goalProgress,
  parseVotePackages,
  validateCustomVoteCount,
} from "./pricing";

describe("centsForVotes", () => {
  it("multiplies votes by the per-vote price", () => {
    expect(centsForVotes(5, 100)).toBe(500);
    expect(centsForVotes(1, 100)).toBe(100);
    expect(centsForVotes(100, 100)).toBe(10_000);
  });

  it("rejects non-positive or non-integer votes", () => {
    expect(() => centsForVotes(0, 100)).toThrow(RangeError);
    expect(() => centsForVotes(-5, 100)).toThrow(RangeError);
    expect(() => centsForVotes(1.5, 100)).toThrow(RangeError);
  });

  it("rejects a non-positive vote price", () => {
    expect(() => centsForVotes(5, 0)).toThrow(RangeError);
    expect(() => centsForVotes(5, -100)).toThrow(RangeError);
  });
});

describe("parseVotePackages", () => {
  it("prices every package from the current vote price", () => {
    const packages = parseVotePackages(
      [{ votes: 5 }, { votes: 10 }, { votes: 25 }],
      100,
    );
    expect(packages).toEqual([
      { votes: 5, priceCents: 500 },
      { votes: 10, priceCents: 1_000 },
      { votes: 25, priceCents: 2_500 },
    ]);
  });

  it("repricing follows the vote price, not a stored price", () => {
    const packages = parseVotePackages([{ votes: 5 }], 200);
    expect(packages[0].priceCents).toBe(1_000);
  });

  it("throws on malformed package JSON", () => {
    expect(() => parseVotePackages([{ votes: -1 }], 100)).toThrow();
    expect(() => parseVotePackages([{ votes: "5" }], 100)).toThrow();
    expect(() => parseVotePackages("not an array", 100)).toThrow();
  });
});

describe("validateCustomVoteCount", () => {
  it("accepts a valid positive integer and prices it", () => {
    const result = validateCustomVoteCount(42, 100);
    expect(result).toEqual({ ok: true, priceCents: 4_200 });
  });

  it("rejects zero, negative, and non-integer counts", () => {
    expect(validateCustomVoteCount(0, 100).ok).toBe(false);
    expect(validateCustomVoteCount(-3, 100).ok).toBe(false);
    expect(validateCustomVoteCount(2.5, 100).ok).toBe(false);
  });

  it("rejects absurdly large counts", () => {
    const result = validateCustomVoteCount(1_000_000, 100);
    expect(result.ok).toBe(false);
  });

  it("accepts the upper bound", () => {
    expect(validateCustomVoteCount(10_000, 100).ok).toBe(true);
  });
});

describe("goalProgress", () => {
  it("computes percent and remaining toward a goal", () => {
    expect(goalProgress(25_000_00, 50_000_00)).toEqual({ percent: 50, remainingCents: 25_000_00 });
  });

  it("clamps percent at 100 when the goal is exceeded", () => {
    const result = goalProgress(75_000_00, 50_000_00);
    expect(result.percent).toBe(100);
    expect(result.remainingCents).toBe(0);
  });

  it("never goes negative when nothing has been raised", () => {
    expect(goalProgress(0, 50_000_00)).toEqual({ percent: 0, remainingCents: 50_000_00 });
  });

  it("handles a zero or negative goal without dividing by zero", () => {
    expect(goalProgress(100, 0)).toEqual({ percent: 100, remainingCents: 0 });
    expect(goalProgress(0, 0)).toEqual({ percent: 0, remainingCents: 0 });
  });
});
