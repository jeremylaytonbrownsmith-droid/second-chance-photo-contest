import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EntryForm } from "./entry-form";

export const dynamic = "force-dynamic";

export default async function EnterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; canceled?: string; submitted?: string }>;
}) {
  const { error, canceled, submitted } = await searchParams;
  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });

  return (
    <main className="flex-1 bg-brand-accent px-6 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-primary-dark sm:text-4xl">
            Enter Your Pet
          </h1>
          <p className="mt-3 text-sm text-neutral-600">
            {contest
              ? `Submit a photo and pay the $${(contest.entryFeeCents / 100).toFixed(2)} entry fee — every dollar supports Second Chance's rescue work.`
              : "Entries aren't open right now — check back soon."}
          </p>
        </div>

        {error && (
          <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {canceled === "1" && (
          <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Payment was canceled — your entry wasn&apos;t submitted. Feel free to try again.
          </p>
        )}
        {submitted === "pending" ? (
          <div className="rounded-xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
            <p className="text-3xl" aria-hidden="true">
              🎉
            </p>
            <h2 className="mt-2 text-lg font-bold text-neutral-900">You&apos;re entered!</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Payment received — thanks for supporting Second Chance. An admin will review your photo shortly, and
              it&apos;ll appear on the site as soon as it&apos;s approved. We&apos;ll also email you a receipt.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/gallery"
                className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-primary-dark hover:shadow-md active:translate-y-0"
              >
                Browse the gallery
              </Link>
              <Link
                href="/leaderboard"
                className="rounded-md border border-brand-primary bg-white px-5 py-2.5 text-sm font-semibold text-brand-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-accent hover:shadow-md active:translate-y-0"
              >
                See the leaderboard
              </Link>
            </div>
          </div>
        ) : (
          <>
            {contest && (
              <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <EntryForm entryFeeCents={contest.entryFeeCents} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
