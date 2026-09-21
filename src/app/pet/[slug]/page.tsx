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

export default async function PetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = await loadEntry(slug);
  if (!entry) notFound();

  const pageUrl = `${siteUrl()}/pet/${entry.slug}`;
  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });

  return (
    <main className="flex-1 bg-brand-accent px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Image src={theme.logo.src} alt={theme.logo.alt} width={160} height={56} className="h-10 w-auto" />
          <Link href="/gallery" className="text-sm font-medium text-brand-primary hover:underline">
            ← Back to the gallery
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="relative aspect-square w-full bg-neutral-100">
            <Image
              src={entry.photoUrl}
              alt={entry.petName}
              fill
              priority
              sizes="(min-width: 672px) 672px, 100vw"
              className="object-cover"
            />
          </div>
          <div className="p-6 text-center">
            <h1 className="text-2xl font-semibold text-brand-primary-dark">{entry.petName}</h1>
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
