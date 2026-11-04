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

  /** This-7-days vs. the 7 days before that, plus a 14-day daily sparkline
   * (oldest first) — the "+53 this week" + mini-chart pattern on each
   * card, not just a flat cumulative number. */
  entriesWeekDelta: number;
  entriesTrend: number[];
  votesWeekDelta: number;
  votesTrend: number[];
  raisedCentsWeekDelta: number;
  raisedCentsTrend: number[];

  /** Null when nothing is waiting — the "all caught up" case. Otherwise
   * how long the oldest pending entry has been sitting there, for a
   * stale-queue warning (the "Overdue" card's actual equivalent here —
   * nothing in this app has a deadline the way a training course does,
   * but a photo waiting days for a decision is the real analog). */
  pendingOldestHours: number | null;
}

/** Buckets a list of (day-string, value) pairs into one total per day over
 * the trailing `TREND_DAYS`, oldest first, filling in zero for days with
 * nothing — the shared shape every sparkline on the dashboard uses. */
function bucketDaily(dayValues: Array<{ day: string; value: number }>, startOfToday: Date): number[] {
  const totals = new Map<string, number>();
  for (const { day, value } of dayValues) {
    totals.set(day, (totals.get(day) ?? 0) + value);
  }
  const series: number[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(startOfToday);
    d.setUTCDate(d.getUTCDate() - i);
    series.push(totals.get(dayString(d)) ?? 0);
  }
  return series;
}

/** Sum of the last 7 entries in a daily series (today inclusive) vs. the 7
 * before that — the "+53 this week" comparison. Assumes `series` is
 * `TREND_DAYS` long, oldest first, which only holds while TREND_DAYS=14. */
function weekOverWeekDelta(series: number[]): number {
  const thisWeek = series.slice(-7).reduce((sum, n) => sum + n, 0);
  const lastWeek = series.slice(-14, -7).reduce((sum, n) => sum + n, 0);
  return thisWeek - lastWeek;
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
    oldestPending,
    voteAgg,
    totalRaised,
    visitRows,
    entriesInWindow,
    votePurchasesInWindow,
    freeVotesInWindow,
    transactionsInWindow,
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
    prisma.entry.findFirst({ where: { contestId, status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    prisma.entry.aggregate({ where: { contestId, voidedAt: null }, _sum: { voteCount: true } }),
    prisma.transaction.aggregate({ where: { contestId, status: "SUCCEEDED" }, _sum: { amountCents: true } }),
    prisma.pageVisit.groupBy({ by: ["day"], where: { day: { gte: trendStartDay } }, _count: { _all: true } }),
    // Window-scoped rows for the sparklines/deltas below — fetched raw and
    // bucketed in JS rather than a date_trunc groupBy, since Prisma has no
    // portable "group by day" and this is bounded by contest scale
    // (dozens to low hundreds of rows), not something to over-engineer.
    prisma.entry.findMany({
      where: { contestId, voidedAt: null, createdAt: { gte: trendStart } },
      select: { createdAt: true },
    }),
    prisma.transaction.findMany({
      where: { contestId, type: "VOTE_PURCHASE", status: "SUCCEEDED", createdAt: { gte: trendStart } },
      select: { createdAt: true, voteQuantity: true },
    }),
    prisma.freeVoteLog.findMany({
      where: { contestId, votedOn: { gte: trendStart } },
      select: { votedOn: true },
    }),
    prisma.transaction.findMany({
      where: { contestId, status: "SUCCEEDED", createdAt: { gte: trendStart } },
      select: { createdAt: true, amountCents: true },
    }),
  ]);

  const trendByDay = new Map(visitRows.map((row) => [row.day, row._count._all]));
  const visitorTrend: { day: string; count: number }[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(startOfToday);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dayString(d);
    visitorTrend.push({ day: key, count: trendByDay.get(key) ?? 0 });
  }

  const entriesTrend = bucketDaily(
    entriesInWindow.map((e) => ({ day: dayString(e.createdAt), value: 1 })),
    startOfToday,
  );

  const voteDayValues = [
    ...votePurchasesInWindow.map((t) => ({ day: dayString(t.createdAt), value: t.voteQuantity ?? 0 })),
    ...freeVotesInWindow.map((v) => ({ day: dayString(v.votedOn), value: 1 })),
  ];
  const votesTrend = bucketDaily(voteDayValues, startOfToday);

  const raisedCentsTrend = bucketDaily(
    transactionsInWindow.map((t) => ({ day: dayString(t.createdAt), value: t.amountCents })),
    startOfToday,
  );

  const pendingOldestHours = oldestPending
    ? Math.round((Date.now() - oldestPending.createdAt.getTime()) / (60 * 60 * 1000))
    : null;

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
    entriesWeekDelta: weekOverWeekDelta(entriesTrend),
    entriesTrend,
    votesWeekDelta: weekOverWeekDelta(votesTrend),
    votesTrend,
    raisedCentsWeekDelta: weekOverWeekDelta(raisedCentsTrend),
    raisedCentsTrend,
    pendingOldestHours,
  };
}
