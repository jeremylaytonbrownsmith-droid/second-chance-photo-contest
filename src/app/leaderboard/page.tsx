import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLeaderboard, getContestTotals } from "@/lib/entries";
import { goalProgress } from "@/lib/pricing";
import { theme } from "@/lib/theme";
import { Countdown } from "@/components/Countdown";

export const dynamic = "force-dynamic";

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });

  if (!contest) {
    return (
      <main className="flex flex-1 items-center justify-center bg-brand-accent px-6 py-16 text-center">
        <p className="text-neutral-500">No contest is configured yet.</p>
      </main>
    );
  }

  const [entries, totals] = await Promise.all([
    getLeaderboard(contest.id),
    getContestTotals(contest.id),
  ]);

  const progress = goalProgress(totals.raisedCents, contest.goalCents);
  const topTen = entries.slice(0, 10);
  const rest = entries.slice(10);

  return (
    <main className="flex-1 bg-brand-accent px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src={theme.logo.src} alt={theme.logo.alt} width={180} height={64} unoptimized className="h-12 w-auto" />
          <h1 className="text-2xl font-semibold text-brand-primary-dark sm:text-3xl">{contest.name}</h1>
          <p className="text-sm text-neutral-600">
            <Countdown endsAt={contest.endsAt.toISOString()} />
          </p>
          <Link href="/gallery" className="text-sm font-medium text-brand-primary hover:underline">
            ← Back to the gallery
          </Link>
        </div>

        <div className="mb-10 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-neutral-700">
            <span>${(totals.raisedCents / 100).toLocaleString()} raised</span>
            <span>${(contest.goalCents / 100).toLocaleString()} goal</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-brand-primary transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-neutral-500">
            {progress.percent >= 100
              ? "Goal reached — thank you!"
              : `$${(progress.remainingCents / 100).toLocaleString()} to go`}
          </p>
        </div>

        {entries.length === 0 ? (
          <p className="text-center text-neutral-500">No entries yet — be the first!</p>
        ) : (
          <>
            <ol className="mb-8 space-y-2">
              {topTen.map((entry, index) => (
                <li key={entry.id}>
                  <Link
                    href={`/pet/${entry.slug}`}
                    className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition hover:shadow-md"
                  >
                    <span className="w-8 shrink-0 text-center text-lg font-semibold text-neutral-500">
                      {MEDAL[index] ?? index + 1}
                    </span>
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-neutral-100">
                      <Image src={entry.photoUrl} alt={entry.petName} fill sizes="56px" className="object-cover" />
                    </div>
                    <span className="flex-1 truncate font-medium text-neutral-900">{entry.petName}</span>
                    <span className="shrink-0 text-sm font-semibold text-brand-primary">
                      {entry.voteCount.toLocaleString()} votes
                    </span>
                  </Link>
                </li>
              ))}
            </ol>

            {rest.length > 0 && (
              <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
                <ol start={11} className="divide-y divide-neutral-100">
                  {rest.map((entry, index) => (
                    <li key={entry.id}>
                      <Link
                        href={`/pet/${entry.slug}`}
                        className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-brand-accent"
                      >
                        <span className="w-6 shrink-0 text-neutral-400">{index + 11}</span>
                        <span className="flex-1 truncate text-neutral-800">{entry.petName}</span>
                        <span className="shrink-0 text-neutral-500">{entry.voteCount.toLocaleString()} votes</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
