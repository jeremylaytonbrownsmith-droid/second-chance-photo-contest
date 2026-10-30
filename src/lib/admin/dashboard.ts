import { prisma } from "@/lib/prisma";

const TREND_DAYS = 14;

function dayString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export interface DashboardStats {
  visitorsToday: number;
  entriesToday: number;
  votesToday: number;
  raisedTodayCents: number;
  totalEntries: number;
  pendingModeration: number;
  totalVotes: number;
  totalRaisedCents: number;
  /** Oldest first, one row per of the last `TREND_DAYS` calendar days. */
  visitorTrend: { day: string; count: number }[];
}

/** Everything the admin dashboard shows. One function, a handful of
 * parallel queries — kept here rather than inline in the page so the page
 * component stays presentational. */
export async function getDashboardStats(contestId: string): Promise<DashboardStats> {
  const startOfToday = startOfUtcDay(new Date());
  const today = dayString(startOfToday);

  const trendStart = new Date(startOfToday);
  trendStart.setUTCDate(trendStart.getUTCDate() - (TREND_DAYS - 1));
  const trendStartDay = dayString(trendStart);

  const [
    visitorsToday,
    entriesToday,
    votePurchasesToday,
    freeVotesToday,
    raisedToday,
    totalEntries,
    pendingModeration,
    voteAgg,
    totalRaised,
    visitRows,
  ] = await Promise.all([
    prisma.pageVisit.count({ where: { day: today } }),
    prisma.entry.count({ where: { contestId, voidedAt: null, createdAt: { gte: startOfToday } } }),
    prisma.transaction.aggregate({
      where: { contestId, type: "VOTE_PURCHASE", status: "SUCCEEDED", createdAt: { gte: startOfToday } },
      _sum: { voteQuantity: true },
    }),
    prisma.freeVoteLog.count({ where: { contestId, votedOn: startOfToday } }),
    prisma.transaction.aggregate({
      where: { contestId, status: "SUCCEEDED", createdAt: { gte: startOfToday } },
      _sum: { amountCents: true },
    }),
    prisma.entry.count({ where: { contestId, voidedAt: null } }),
    prisma.entry.count({ where: { contestId, status: "PENDING" } }),
    prisma.entry.aggregate({ where: { contestId, voidedAt: null }, _sum: { voteCount: true } }),
    prisma.transaction.aggregate({ where: { contestId, status: "SUCCEEDED" }, _sum: { amountCents: true } }),
    prisma.pageVisit.groupBy({ by: ["day"], where: { day: { gte: trendStartDay } }, _count: { _all: true } }),
  ]);

  const trendByDay = new Map(visitRows.map((row) => [row.day, row._count._all]));
  const visitorTrend: { day: string; count: number }[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(startOfToday);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dayString(d);
    visitorTrend.push({ day: key, count: trendByDay.get(key) ?? 0 });
  }

  return {
    visitorsToday,
    entriesToday,
    votesToday: (votePurchasesToday._sum.voteQuantity ?? 0) + freeVotesToday,
    raisedTodayCents: raisedToday._sum.amountCents ?? 0,
    totalEntries,
    pendingModeration,
    totalVotes: voteAgg._sum.voteCount ?? 0,
    totalRaisedCents: totalRaised._sum.amountCents ?? 0,
    visitorTrend,
  };
}
