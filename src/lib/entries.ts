import { prisma } from "./prisma";
import type { Entry, EntryStatus } from "@prisma/client";

/**
 * Entry CRUD/query helpers. All public-facing reads filter to APPROVED —
 * moderation queue and admin views go around these, not through them.
 */

export function slugify(petName: string): string {
  const base = petName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "pet";
}

/** Appends a short random suffix until the slug is free within the contest.
 * Called at entry-creation time, not on every read. */
export async function uniqueSlugForContest(contestId: string, petName: string): Promise<string> {
  const base = slugify(petName);
  let candidate = base;
  let attempt = 0;
  while (
    await prisma.entry.findUnique({
      where: { contestId_slug: { contestId, slug: candidate } },
    })
  ) {
    attempt += 1;
    candidate = `${base}-${Math.random().toString(36).slice(2, 2 + 4)}`;
    if (attempt > 20) {
      throw new Error(`Could not find a unique slug for "${petName}" after ${attempt} attempts`);
    }
  }
  return candidate;
}

export type EntrySort = "newest" | "votes" | "random";

export interface ListEntriesOptions {
  contestId: string;
  search?: string;
  sort?: EntrySort;
  status?: EntryStatus;
}

export async function listApprovedEntries(options: ListEntriesOptions): Promise<Entry[]> {
  const { contestId, search, sort = "newest", status = "APPROVED" } = options;

  const where = {
    contestId,
    status,
    voidedAt: null,
    ...(search
      ? {
          OR: [
            { petName: { contains: search, mode: "insensitive" as const } },
            { ownerName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  if (sort === "random") {
    // Deterministic-enough shuffle without a raw SQL ORDER BY random() call
    // per request — fine at contest scale (dozens to low hundreds of
    // entries), revisit if entry counts grow much larger.
    const entries = await prisma.entry.findMany({ where });
    return shuffle(entries);
  }

  return prisma.entry.findMany({
    where,
    orderBy: sort === "votes" ? { voteCount: "desc" } : { createdAt: "desc" },
  });
}

export async function getApprovedEntryBySlug(contestId: string, slug: string): Promise<Entry | null> {
  return prisma.entry.findFirst({
    where: { contestId, slug, status: "APPROVED", voidedAt: null },
  });
}

export async function getLeaderboard(contestId: string, limit = 50): Promise<Entry[]> {
  return prisma.entry.findMany({
    where: { contestId, status: "APPROVED", voidedAt: null, eliminated: false },
    orderBy: { voteCount: "desc" },
    take: limit,
  });
}

export async function getContestTotals(contestId: string): Promise<{ raisedCents: number }> {
  const result = await prisma.transaction.aggregate({
    where: { contestId, status: "SUCCEEDED" },
    _sum: { amountCents: true },
  });
  return { raisedCents: result._sum.amountCents ?? 0 };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Recomputes Entry.voteCount from source-of-truth rows (successful
 * VOTE_PURCHASE transactions + FreeVoteLog). Call after any vote-affecting
 * write instead of incrementing the cache by hand, so it can never drift. */
export async function recomputeVoteCount(entryId: string): Promise<number> {
  const [purchased, free] = await Promise.all([
    prisma.transaction.aggregate({
      where: { entryId, type: "VOTE_PURCHASE", status: "SUCCEEDED" },
      _sum: { voteQuantity: true },
    }),
    prisma.freeVoteLog.count({ where: { entryId } }),
  ]);
  const total = (purchased._sum.voteQuantity ?? 0) + free;
  await prisma.entry.update({ where: { id: entryId }, data: { voteCount: total } });
  return total;
}
