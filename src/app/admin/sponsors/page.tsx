import Image from "next/image";
import type { Sponsor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/auth";
import { getActiveSponsors } from "@/lib/sponsors";

export const dynamic = "force-dynamic";

export default async function AdminSponsorsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });
  const sponsors = contest ? await getActiveSponsors(contest.id) : { featured: [], supporter: [] };

  return (
    <main className="flex-1 bg-neutral-100 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Sponsors</h1>
          <p className="text-sm text-neutral-500">
            Logos shown on the homepage, grouped by tier. Featured sponsors appear larger.
          </p>
        </div>

        {error && (
          <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {!contest ? (
          <p className="text-neutral-500">No contest is configured.</p>
        ) : (
          <>
            <div className="mb-8 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-neutral-900">Add a sponsor</h2>
              <form
                action="/api/admin/sponsors"
                method="POST"
                encType="multipart/form-data"
                className="grid gap-3 sm:grid-cols-2"
              >
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="mb-1 block text-xs font-medium text-neutral-600">
                    Sponsor name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="tier" className="mb-1 block text-xs font-medium text-neutral-600">
                    Tier
                  </label>
                  <select
                    id="tier"
                    name="tier"
                    defaultValue="SUPPORTER"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  >
                    <option value="FEATURED">Featured</option>
                    <option value="SUPPORTER">Supporter</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="linkUrl" className="mb-1 block text-xs font-medium text-neutral-600">
                    Link (optional)
                  </label>
                  <input
                    id="linkUrl"
                    name="linkUrl"
                    type="url"
                    placeholder="https://"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="logo" className="mb-1 block text-xs font-medium text-neutral-600">
                    Logo image
                  </label>
                  <input
                    id="logo"
                    name="logo"
                    type="file"
                    accept="image/*"
                    required
                    className="w-full text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-primary-dark"
                  >
                    Add sponsor
                  </button>
                </div>
              </form>
            </div>

            <SponsorGroup title="Featured" sponsors={sponsors.featured} />
            <SponsorGroup title="Supporter" sponsors={sponsors.supporter} />

            {sponsors.featured.length === 0 && sponsors.supporter.length === 0 && (
              <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
                No sponsors added yet.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function SponsorGroup({ title, sponsors }: { title: string; sponsors: Sponsor[] }) {
  if (sponsors.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">{title}</h2>
      <div className="space-y-2">
        {sponsors.map((sponsor) => (
          <div
            key={sponsor.id}
            className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
              <Image src={sponsor.logoUrl} alt={sponsor.name} fill sizes="48px" className="object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-neutral-900">{sponsor.name}</p>
              {sponsor.linkUrl && <p className="truncate text-xs text-neutral-400">{sponsor.linkUrl}</p>}
            </div>
            <form action={`/api/admin/sponsors/${sponsor.id}/remove`} method="POST">
              <button
                type="submit"
                className="whitespace-nowrap rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors duration-150 hover:bg-red-50"
              >
                Remove
              </button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
