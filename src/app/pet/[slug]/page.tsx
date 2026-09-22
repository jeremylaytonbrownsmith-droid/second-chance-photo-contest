import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getApprovedEntryBySlug } from "@/lib/entries";
import { theme } from "@/lib/theme";
import { siteUrl } from "@/lib/site-url";
import { ShareButtons } from "./share-buttons";

async function loadEntry(slug: string) {
  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });
  if (!contest) return null;
  return getApprovedEntryBySlug(contest.id, slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = await loadEntry(slug);
  if (!entry) return {};

  const pageUrl = `${siteUrl()}/pet/${entry.slug}`;
  const title = `Vote for ${entry.petName} — ${theme.org.name} Photo Contest`;
  const description = entry.caption || `Help ${entry.petName} win the ${theme.org.name} photo contest.`;

  // Image tags (og:image, twitter:image, twitter:card) are added
  // automatically by Next from the sibling opengraph-image.tsx file in this
  // route segment — no need to declare them here.
  return {
    title,
    description,
    openGraph: { title, description, url: pageUrl },
    twitter: { title, description },
  };
}

export default async function PetPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ entered?: string }>;
}) {
  const { slug } = await params;
  const { entered } = await searchParams;
  const entry = await loadEntry(slug);
  if (!entry) notFound();

  const pageUrl = `${siteUrl()}/pet/${entry.slug}`;
  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });

  return (
    <main className="flex-1 bg-brand-accent px-6 py-12">
      <div className="mx-auto max-w-2xl">
        {entered === "1" && (
          <p className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800">
            🎉 You&apos;re entered! Share this page to start collecting votes.
          </p>
        )}
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Link href="/gallery" className="group inline-flex items-center gap-1 text-sm font-medium text-brand-primary">
            <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
            <span className="transition-colors duration-200 group-hover:text-brand-primary-dark">
              Back to the gallery
            </span>
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="group relative aspect-square w-full overflow-hidden bg-neutral-100">
            <Image
              src={entry.photoUrl}
              alt={entry.petName}
              fill
              priority
              sizes="(min-width: 672px) 672px, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="p-6 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-brand-primary-dark">{entry.petName}</h1>
            <p className="mt-1 text-sm text-neutral-500">Entered by {entry.ownerName}</p>
            {entry.caption && <p className="mt-4 text-neutral-700">{entry.caption}</p>}

            <p className="mt-6 text-3xl font-bold text-brand-primary">
              {entry.voteCount.toLocaleString()} <span className="text-base font-medium text-neutral-500">votes</span>
            </p>

            {contest?.prizeText && (
              <p className="mt-2 rounded-md bg-brand-accent px-3 py-2 text-xs text-neutral-600">
                🏆 {contest.prizeText}
              </p>
            )}

            <div className="mt-6">
              <ShareButtons petName={entry.petName} pageUrl={pageUrl} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
