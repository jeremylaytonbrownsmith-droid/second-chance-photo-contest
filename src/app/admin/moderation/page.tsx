import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdmin();
  const { error } = await searchParams;

  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });
  const pending = contest
    ? await prisma.entry.findMany({
        where: { contestId: contest.id, status: "PENDING" },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <main className="flex-1 bg-neutral-100 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-neutral-900">Moderation queue</h1>
            <p className="truncate text-sm text-neutral-500">
              Signed in as {admin.email} · {pending.length} pending
            </p>
          </div>
          <form action="/api/admin/logout" method="POST" className="shrink-0">
            <button
              type="submit"
              className="whitespace-nowrap rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors duration-150 hover:bg-white"
            >
              Sign out
            </button>
          </form>
        </div>

        {error && (
          <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {!contest ? (
          <p className="text-neutral-500">No contest is configured.</p>
        ) : pending.length === 0 ? (
          <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
            Nothing waiting for review — you&apos;re caught up.
          </p>
        ) : (
          <div className="space-y-4">
            {pending.map((entry) => (
              <div key={entry.id} className="flex gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                  <Image src={entry.photoUrl} alt={entry.petName} fill sizes="112px" className="object-cover" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-900">{entry.petName}</p>
                  <p className="text-sm text-neutral-500">
                    {entry.ownerName} · {entry.ownerEmail}
                  </p>
                  {entry.caption && <p className="mt-1 text-sm text-neutral-700">{entry.caption}</p>}
                  <p className="mt-1 text-xs text-neutral-400">
                    Submitted {entry.createdAt.toLocaleDateString()} {entry.createdAt.toLocaleTimeString()}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <form action={`/api/admin/entries/${entry.id}/approve`} method="POST">
                      <button
                        type="submit"
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                    </form>

                    <details className="group">
                      <summary className="cursor-pointer list-none rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors duration-150 hover:bg-red-50">
                        Reject
                      </summary>
                      <form
                        action={`/api/admin/entries/${entry.id}/reject`}
                        method="POST"
                        className="mt-2 flex flex-wrap items-center gap-2"
                      >
                        <input
                          type="text"
                          name="reason"
                          required
                          placeholder="Reason (required)"
                          className="w-56 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-brand-primary focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-700"
                        >
                          Confirm reject
                        </button>
                      </form>
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
