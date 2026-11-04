import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

function toDatetimeLocal(date: Date): string {
  // datetime-local inputs are timezone-naive — shown/edited in UTC here
  // (labeled as such) rather than silently guessing the admin's own
  // timezone and getting the contest window wrong by several hours.
  return date.toISOString().slice(0, 16);
}

function centsToDollarsInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const { error, success } = await searchParams;

  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });

  return (
    <main className="flex-1 bg-neutral-100 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Contest settings</h1>
          <p className="text-sm text-neutral-500">
            The dates, pricing, and prize text shown on the public site — change these here instead of needing a
            code change.
          </p>
        </div>

        {success && (
          <p className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Settings saved.
          </p>
        )}
        {error && (
          <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {!contest ? (
          <p className="text-neutral-500">No contest is configured.</p>
        ) : (
          <form
            action="/api/admin/contest/settings"
            method="POST"
            className="space-y-5 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-neutral-600">
                Contest name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={contest.name}
                required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="startsAt" className="mb-1 block text-xs font-medium text-neutral-600">
                  Starts (UTC)
                </label>
                <input
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(contest.startsAt)}
                  required
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="endsAt" className="mb-1 block text-xs font-medium text-neutral-600">
                  Ends (UTC)
                </label>
                <input
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(contest.endsAt)}
                  required
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="entryFeeDollars" className="mb-1 block text-xs font-medium text-neutral-600">
                  Entry fee ($)
                </label>
                <input
                  id="entryFeeDollars"
                  name="entryFeeDollars"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={centsToDollarsInput(contest.entryFeeCents)}
                  required
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="votePriceDollars" className="mb-1 block text-xs font-medium text-neutral-600">
                  Price per vote ($)
                </label>
                <input
                  id="votePriceDollars"
                  name="votePriceDollars"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={centsToDollarsInput(contest.votePriceCents)}
                  required
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="goalDollars" className="mb-1 block text-xs font-medium text-neutral-600">
                  Fundraising goal ($)
                </label>
                <input
                  id="goalDollars"
                  name="goalDollars"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={centsToDollarsInput(contest.goalCents)}
                  required
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>
            <p className="-mt-3 text-xs text-neutral-400">
              Vote packages (the $5/$10/$25 buttons) aren&apos;t editable here yet — ask if you need those changed.
            </p>

            <div>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  name="moderationEnabled"
                  defaultChecked={contest.moderationEnabled}
                  className="h-4 w-4 rounded border-neutral-300 text-brand-primary focus:ring-brand-primary"
                />
                Require admin approval before a new entry goes live
              </label>
            </div>

            <div>
              <label htmlFor="prizeText" className="mb-1 block text-xs font-medium text-neutral-600">
                Grand prize text
              </label>
              <textarea
                id="prizeText"
                name="prizeText"
                rows={3}
                defaultValue={contest.prizeText ?? ""}
                className="w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-primary-dark"
            >
              Save settings
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
