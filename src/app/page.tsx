import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLeaderboard, getContestTotals } from "@/lib/entries";
import { goalProgress } from "@/lib/pricing";
import { theme } from "@/lib/theme";
import { Countdown } from "@/components/Countdown";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "Enter your pet",
    body: "Submit a photo and a short caption. A small entry fee goes straight to Second Chance's rescue work.",
  },
  {
    title: "Collect votes",
    body: "Friends and family vote for your pet — one free vote a day, or vote packs for those who want to go all in.",
  },
  {
    title: "Win prizes",
    body: "Top pets win prizes, including a spot on a limited-edition Second Chance beer can.",
  },
];

export default async function HomePage() {
  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });

  const [topEntries, totals] = contest
    ? await Promise.all([getLeaderboard(contest.id, 4), getContestTotals(contest.id)])
    : [[], { raisedCents: 0 }];

  const progress = contest ? goalProgress(totals.raisedCents, contest.goalCents) : null;

  return (
    <main className="flex-1 bg-brand-accent">
      {/* Hero */}
      <section className="px-6 pb-12 pt-16 text-center">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <Image src={theme.logo.src} alt={theme.logo.alt} width={220} height={78} priority className="h-16 w-auto" />
          <h1 className="text-3xl font-bold text-brand-primary-dark sm:text-4xl">Pet Photo Contest</h1>
          <p className="max-w-lg text-neutral-600">
            Vote for your favorite pets and help {theme.org.name} raise funds for pets in need — every vote is a
            donation.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/gallery"
              className="rounded-md bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-dark"
            >
              Vote for a pet
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-md border border-brand-primary bg-white px-6 py-3 text-sm font-semibold text-brand-primary hover:bg-brand-accent"
            >
              See the leaderboard
            </Link>
          </div>
          {!contest && (
            <p className="mt-4 text-xs text-neutral-400">Entry submissions open soon — check back for contest details.</p>
          )}
        </div>
      </section>

      {contest && (
        <>
          {/* Live stats */}
          <section className="px-6 pb-12">
            <div className="mx-auto max-w-2xl rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-neutral-700">
                <span>${(totals.raisedCents / 100).toLocaleString()} raised</span>
                <span>${(contest.goalCents / 100).toLocaleString()} goal</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-brand-primary transition-all"
                  style={{ width: `${progress?.percent ?? 0}%` }}
                />
              </div>
              <p className="mt-3 text-center text-sm text-neutral-500">
                <Countdown endsAt={contest.endsAt.toISOString()} /> left in {contest.name}
              </p>
            </div>
          </section>

          {/* Top contestants preview */}
          {topEntries.length > 0 && (
            <section className="px-6 pb-14">
              <div className="mx-auto max-w-4xl">
                <h2 className="mb-6 text-center text-xl font-semibold text-brand-primary-dark">
                  Meet the contestants
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {topEntries.map((entry, index) => (
                    <Link
                      key={entry.id}
                      href={`/pet/${entry.slug}`}
                      className="group overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition hover:shadow-md"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
                        <Image
                          src={entry.photoUrl}
                          alt={entry.petName}
                          fill
                          priority={index === 0}
                          sizes="(min-width: 640px) 25vw, 50vw"
                          className="object-cover transition group-hover:scale-105"
                        />
                      </div>
                      <div className="p-2 text-center">
                        <p className="truncate text-sm font-medium text-neutral-900">{entry.petName}</p>
                        <p className="text-xs text-neutral-500">{entry.voteCount.toLocaleString()} votes</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Link href="/gallery" className="text-sm font-medium text-brand-primary hover:underline">
                    See every entry →
                  </Link>
                </div>
              </div>
            </section>
          )}

          {contest.prizeText && (
            <section className="px-6 pb-14">
              <div className="mx-auto max-w-2xl rounded-xl bg-brand-primary px-6 py-8 text-center text-white">
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-secondary">Grand Prize</p>
                <p className="mt-2 text-lg">{contest.prizeText}</p>
              </div>
            </section>
          )}
        </>
      )}

      {/* How it works */}
      <section className="border-t border-neutral-200 bg-white px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-xl font-semibold text-brand-primary-dark">How it works</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mb-1 font-semibold text-neutral-900">{step.title}</h3>
                <p className="text-sm text-neutral-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
