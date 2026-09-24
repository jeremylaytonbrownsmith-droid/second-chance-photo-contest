import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLeaderboard, getContestTotals, getRecentActivity } from "@/lib/entries";
import { goalProgress } from "@/lib/pricing";
import { theme } from "@/lib/theme";
import { Countdown } from "@/components/Countdown";
import { formatRelativeTime } from "@/lib/format-relative-time";

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
    body: "The winning pet's photo becomes a painted portrait, featured on a specially brewed, limited-edition beer.",
  },
];

export default async function HomePage() {
  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });

  const [topEntries, totals, recentActivity] = contest
    ? await Promise.all([getLeaderboard(contest.id, 4), getContestTotals(contest.id), getRecentActivity(contest.id)])
    : [[], { raisedCents: 0 }, []];

  const progress = contest ? goalProgress(totals.raisedCents, contest.goalCents) : null;

  return (
    <main className="flex-1 bg-brand-accent">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-12 pt-16 text-center">
        {topEntries.length > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden sm:block"
          >
            {topEntries.map((entry, index) => {
              const positions = [
                "left-[3%] top-[8%] -rotate-6",
                "right-[4%] top-[4%] rotate-6",
                "left-[8%] bottom-[6%] rotate-3",
                "right-[7%] bottom-[10%] -rotate-3",
              ];
              return (
                <div
                  key={entry.id}
                  className={`absolute h-28 w-28 rounded-sm bg-white p-2 shadow-lg lg:h-36 lg:w-36 ${positions[index]}`}
                >
                  <div className="relative h-full w-full overflow-hidden">
                    <Image src={entry.photoUrl} alt="" fill sizes="144px" className="object-cover" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-2xl px-4 py-6 sm:bg-brand-accent/90 sm:backdrop-blur-sm">
          <h1 className="text-5xl font-extrabold tracking-tight text-brand-primary-dark sm:text-6xl">
            Pet Photo Contest
          </h1>
          <p className="max-w-lg text-lg text-neutral-600">
            Enter your pet or vote for your favorites — help {theme.org.name} raise funds for pets in need. Every
            entry and every vote is a donation.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/enter"
              className="rounded-md bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-primary-dark hover:shadow-md active:translate-y-0"
            >
              Enter your pet
            </Link>
            <Link
              href="/gallery"
              className="rounded-md border border-brand-primary bg-white px-6 py-3 text-sm font-semibold text-brand-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-accent hover:shadow-md active:translate-y-0"
            >
              Vote for a pet
            </Link>
          </div>
          {contest ? (
            <Link
              href="/leaderboard"
              className="group mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-primary"
            >
              <span className="transition-colors duration-200 group-hover:text-brand-primary-dark">
                See the leaderboard
              </span>
              <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          ) : (
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
                  className="h-full rounded-full bg-brand-primary transition-all duration-700 ease-out"
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
                      className="group overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
                        <Image
                          src={entry.photoUrl}
                          alt={entry.petName}
                          fill
                          priority={index === 0}
                          sizes="(min-width: 640px) 25vw, 50vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white shadow-sm">
                          {index + 1}
                        </span>
                      </div>
                      <div className="p-3 text-center">
                        <p className="truncate text-base font-bold tracking-tight text-neutral-900 transition-colors duration-200 group-hover:text-brand-primary">
                          {entry.petName}
                        </p>
                        <p className="text-xs font-medium text-neutral-500">
                          {entry.voteCount.toLocaleString()} votes
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Link
                    href="/gallery"
                    className="group inline-flex items-center gap-1 text-sm font-medium text-brand-primary"
                  >
                    <span className="transition-colors duration-200 group-hover:text-brand-primary-dark">
                      See every entry
                    </span>
                    <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </Link>
                </div>
              </div>
            </section>
          )}

          {recentActivity.length > 0 && (
            <section className="px-6 pb-14">
              <div className="mx-auto max-w-2xl">
                <h2 className="mb-6 text-center text-xl font-semibold text-brand-primary-dark">Recent activity</h2>
                <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                  {recentActivity.map((activity) => (
                    <Link
                      key={activity.id}
                      href={`/pet/${activity.entry.slug}`}
                      className="group flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-brand-accent"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-100">
                        <Image
                          src={activity.entry.photoUrl}
                          alt={activity.entry.petName}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <p className="min-w-0 flex-1 truncate text-sm text-neutral-700">
                        <span className="font-semibold text-neutral-900 transition-colors duration-150 group-hover:text-brand-primary">
                          {activity.donorName}
                        </span>{" "}
                        {activity.type === "ENTRY_FEE" ? (
                          <>entered <span className="font-medium">{activity.entry.petName}</span></>
                        ) : (
                          <>
                            gave <span className="font-medium">{activity.voteQuantity}</span>{" "}
                            {activity.voteQuantity === 1 ? "vote" : "votes"} to{" "}
                            <span className="font-medium">{activity.entry.petName}</span>
                          </>
                        )}
                      </p>
                      <span className="shrink-0 text-xs text-neutral-400">
                        {formatRelativeTime(activity.createdAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {contest.prizeText && (
            <section className="px-6 pb-14">
              <div className="mx-auto max-w-2xl rounded-xl bg-brand-primary px-6 py-8 text-center text-white shadow-sm transition-shadow duration-300 hover:shadow-lg">
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
          <div className="grid items-start gap-8 sm:grid-cols-3">
            {STEPS.map((step, index) => {
              const content = (
                <>
                  <div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white transition-transform duration-200 group-hover:scale-110">
                    {index + 1}
                  </div>
                  <h3 className="mb-1 font-semibold text-neutral-900">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-neutral-600">{step.body}</p>
                </>
              );
              return index === 0 ? (
                <Link
                  key={step.title}
                  href="/enter"
                  className="group flex flex-col items-start rounded-lg text-left transition-colors"
                >
                  {content}
                </Link>
              ) : (
                <div key={step.title} className="group flex flex-col items-start text-left">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
