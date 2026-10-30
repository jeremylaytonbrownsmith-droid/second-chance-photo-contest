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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500">{contest ? contest.name : "No contest is configured."}</p>
        </div>

        {!stats ? (
          <p className="text-neutral-500">No contest is configured.</p>
        ) : (
          <>
            <section className="mb-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Today</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Visitors" value={stats.visitorsToday.toLocaleString()} />
                <StatCard label="New entries" value={stats.entriesToday.toLocaleString()} />
                <StatCard label="Votes cast" value={stats.votesToday.toLocaleString()} />
                <StatCard label="Raised" value={money(stats.raisedTodayCents)} accent />
              </div>
            </section>

            <section className="mb-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">All time</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Total entries" value={stats.totalEntries.toLocaleString()} />
                <StatCard label="Pending review" value={stats.pendingModeration.toLocaleString()} />
                <StatCard label="Total votes" value={stats.totalVotes.toLocaleString()} />
                <StatCard label="Total raised" value={money(stats.totalRaisedCents)} accent />
              </div>
            </section>

            <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
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
