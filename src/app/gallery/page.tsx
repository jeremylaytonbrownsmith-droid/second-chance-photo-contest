import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listApprovedEntries, type EntrySort } from "@/lib/entries";
import { theme } from "@/lib/theme";

export const dynamic = "force-dynamic";

function isEntrySort(value: string | undefined): value is EntrySort {
  return value === "newest" || value === "votes" || value === "random";
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort: sortParam } = await searchParams;
  const sort: EntrySort = isEntrySort(sortParam) ? sortParam : "newest";

  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });

  const entries = contest
    ? await listApprovedEntries({ contestId: contest.id, search: q, sort })
    : [];

  return (
    <main className="flex-1 bg-brand-accent px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src={theme.logo.src} alt={theme.logo.alt} width={180} height={64} className="h-12 w-auto" />
          <h1 className="text-2xl font-semibold text-brand-primary-dark sm:text-3xl">Pet Photo Gallery</h1>
          <p className="max-w-lg text-sm text-neutral-600">
            Browse every entry and cast your vote. Each vote helps {theme.org.name} raise funds for pets in need.
          </p>
          <Link href="/leaderboard" className="text-sm font-medium text-brand-primary hover:underline">
            View the leaderboard →
          </Link>
        </div>

        <form method="get" className="mb-8 flex flex-wrap items-center justify-center gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by pet or owner name"
            className="w-64 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="votes">Most votes</option>
            <option value="random">Random</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-dark"
          >
            Apply
          </button>
        </form>

        {!contest ? (
          <p className="text-center text-neutral-500">No contest is configured yet.</p>
        ) : entries.length === 0 ? (
          <p className="text-center text-neutral-500">No entries match your search.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {entries.map((entry) => (
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
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <p className="truncate font-medium text-neutral-900">{entry.petName}</p>
                  <p className="text-xs text-neutral-500">{entry.voteCount.toLocaleString()} votes</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
