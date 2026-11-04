import type { Contest } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/auth";
import { getDashboardStats } from "@/lib/admin/dashboard";

export const dynamic = "force-dynamic";

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function shortDayLabel(day: string): string {
  // day is "YYYY-MM-DD" — render as "M/D" without pulling in a Date just
  // to reformat a string we already have the pieces of.
  const [, month, date] = day.split("-");
  return `${Number(month)}/${Number(date)}`;
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });
  const stats = contest ? await getDashboardStats(contest.id) : null;

  return (
    <main className="flex-1 bg-neutral-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500">{contest ? contest.name : "No contest is configured."}</p>
        </div>

        {contest && <ContestPauseControl contest={contest} />}

        {!stats ? (
          <p className="text-neutral-500">No contest is configured.</p>
        ) : (
          <>
            <section className="mb-4">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Today</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Visitors" value={stats.visitorsToday.toLocaleString()} />
                <StatCard label="New entries" value={stats.entriesToday.toLocaleString()} />
                <StatCard label="Votes cast" value={stats.votesToday.toLocaleString()} />
                <StatCard label="Raised" value={money(stats.raisedTodayCents)} accent />
              </div>
            </section>

            <section className="mb-4">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">All time</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <TrendStatCard
                  label="Total entries"
                  value={stats.totalEntries.toLocaleString()}
                  weekDelta={stats.entriesWeekDelta}
                  trend={stats.entriesTrend}
                />
                <PendingReviewCard pendingCount={stats.pendingModeration} oldestHours={stats.pendingOldestHours} />
                <TrendStatCard
                  label="Total votes"
                  value={stats.totalVotes.toLocaleString()}
                  weekDelta={stats.votesWeekDelta}
                  trend={stats.votesTrend}
                />
                <TrendStatCard
                  label="Total raised"
                  value={money(stats.totalRaisedCents)}
                  weekDelta={stats.raisedCentsWeekDelta}
                  trend={stats.raisedCentsTrend}
                  formatDelta={(n) => money(n)}
                  accent
                />
              </div>
            </section>

            <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Visitors — last 14 days
              </h2>
              <VisitorTrendChart trend={stats.visitorTrend} />
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function ContestPauseControl({ contest }: { contest: Contest }) {
  if (contest.galleryPaused) {
    return (
      <section className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
        <p className="text-sm font-semibold text-amber-900">⏸ Contest is paused</p>
        {contest.galleryPausedReason && <p className="mt-0.5 text-xs text-amber-700">{contest.galleryPausedReason}</p>}
        <p className="mt-1 text-xs text-amber-700">
          New entries, votes, and the public gallery/leaderboard are all blocked right now.
        </p>
        <form action="/api/admin/contest/pause" method="POST" className="mt-2">
          <input type="hidden" name="paused" value="0" />
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-emerald-700"
          >
            Resume contest
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="mb-4 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
      <details>
        <summary className="cursor-pointer text-sm font-medium text-neutral-600">Pause controls</summary>
        <form action="/api/admin/contest/pause" method="POST" className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="paused" value="1" />
          <input
            type="text"
            name="reason"
            placeholder="Reason (optional, shown to visitors)"
            className="w-64 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-brand-primary focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-700"
          >
            Pause everything now
          </button>
        </form>
        <p className="mt-2 text-xs text-neutral-400">
          Blocks new entries and votes, and shows a paused notice on the gallery, leaderboard, and every pet page.
          Nothing is deleted — flip it back on any time.
        </p>
      </details>
    </section>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-bold tracking-tight ${accent ? "text-brand-primary" : "text-neutral-900"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-neutral-500">{label}</p>
    </div>
  );
}

function TrendStatCard({
  label,
  value,
  weekDelta,
  trend,
  accent = false,
  formatDelta = (n: number) => n.toLocaleString(),
}: {
  label: string;
  value: string;
  weekDelta: number;
  trend: number[];
  accent?: boolean;
  formatDelta?: (n: number) => string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className={`text-2xl font-bold tracking-tight ${accent ? "text-brand-primary" : "text-neutral-900"}`}>
          {value}
        </p>
        {weekDelta !== 0 && (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              weekDelta > 0 ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {weekDelta > 0 ? "▲" : "▼"} {formatDelta(Math.abs(weekDelta))} this week
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs font-medium text-neutral-500">{label}</p>
      <Sparkline trend={trend} accent={accent} />
    </div>
  );
}

function Sparkline({ trend, accent = false }: { trend: number[]; accent?: boolean }) {
  const max = Math.max(1, ...trend);
  return (
    <div className="mt-2 flex h-6 items-end gap-0.5">
      {trend.map((value, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${accent ? "bg-brand-primary/40" : "bg-neutral-300"}`}
          style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function PendingReviewCard({ pendingCount, oldestHours }: { pendingCount: number; oldestHours: number | null }) {
  const stale = oldestHours !== null && oldestHours >= 24;

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${stale ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-2xl font-bold tracking-tight ${stale ? "text-amber-900" : "text-neutral-900"}`}>
          {pendingCount.toLocaleString()}
        </p>
        {!stale && (
          <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
            all caught up
          </span>
        )}
      </div>
      <p className={`mt-0.5 text-xs font-medium ${stale ? "text-amber-700" : "text-neutral-500"}`}>Pending review</p>
      {stale && (
        <p className="mt-2 text-[11px] text-amber-700">
          Oldest waiting {oldestHours! >= 48 ? `${Math.floor(oldestHours! / 24)}d` : `${oldestHours}h`}
        </p>
      )}
    </div>
  );
}

function VisitorTrendChart({ trend }: { trend: { day: string; count: number }[] }) {
  const max = Math.max(1, ...trend.map((point) => point.count));

  return (
    <div className="flex h-36 items-end gap-1.5 sm:gap-2">
      {trend.map((point) => (
        <div key={point.day} className="group flex flex-1 flex-col items-center gap-1.5">
          <div className="relative flex h-28 w-full items-end">
            <div
              title={`${point.count} visitor${point.count === 1 ? "" : "s"} on ${point.day}`}
              className="w-full rounded-t-sm bg-brand-primary/80 transition-all duration-200 group-hover:bg-brand-primary"
              style={{ height: `${Math.max(4, (point.count / max) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-neutral-400">{shortDayLabel(point.day)}</span>
        </div>
      ))}
    </div>
  );
}
