/**
 * Demo/dev seed — creates one contest, real entries built from the three
 * photos in public/demo/, and enough SUCCEEDED vote transactions to
 * populate a working leaderboard. Idempotent (skips a pet name that
 * already exists), so it's safe to run more than once.
 *
 * Runs in production ONLY when RUN_SEED_ON_BUILD=true is set in Vercel's
 * environment variables (see package.json's "build" script) — this is a
 * temporary demo-content hook for the client preview, not a permanent part
 * of the deploy. Remove that env var (or this hook) once real entries
 * start flowing in through the actual entry-fee flow.
 *
 * Photos live in public/demo/ (committed, static) rather than going through
 * the StorageProvider — that keeps this demo working on a fresh Vercel
 * deploy with zero R2/Cloudflare setup. Real entries still go through the
 * storage abstraction via the upload flow once that's built.
 */
import { prisma } from "../src/lib/prisma";
import { uniqueSlugForContest, recomputeVoteCount } from "../src/lib/entries";

interface SeedEntry {
  photoUrl: string;
  petName: string;
  ownerName: string;
  ownerEmail: string;
  caption: string;
  votePurchases: number[]; // one Transaction per array entry, each SUCCEEDED
}

const SEED_ENTRIES: SeedEntry[] = [
  {
    photoUrl: "/demo/biscuit.jpg",
    petName: "Biscuit",
    ownerName: "Dana Whitfield",
    ownerEmail: "dana.whitfield@example.com",
    caption: "Biscuit loves a good car ride with the windows cracked and the wind in her ears.",
    votePurchases: [25, 10, 50, 5, 100, 20],
  },
  {
    photoUrl: "/demo/rusty.jpg",
    petName: "Rusty",
    ownerName: "Marcus Delgado",
    ownerEmail: "marcus.delgado@example.com",
    caption: "Rusty exploring the city on a warm evening walk.",
    votePurchases: [10, 10, 5],
  },
  {
    photoUrl: "/demo/whiskers.jpg",
    petName: "Whiskers",
    ownerName: "Priya Anand",
    ownerEmail: "priya.anand@example.com",
    caption: "Whiskers holding down the good armchair, as always.",
    votePurchases: [15, 40, 10, 5],
  },
  {
    photoUrl: "/demo/luna.jpg",
    petName: "Luna",
    ownerName: "Sarah Kimball",
    ownerEmail: "sarah.kimball@example.com",
    caption: "Luna striking a pose on freshly made sheets.",
    votePurchases: [30, 45, 20, 15, 10],
  },
];

async function main() {
  const prizeText =
    "Every entry raises money for Second Chance Pet Adoptions. The grand-prize winner's pet gets turned into a painted portrait and featured on a specially brewed, limited-edition beer.";

  const contest = await prisma.contest.upsert({
    where: { id: "demo-contest" },
    // moderationEnabled: false is a temporary demo setting — the admin
    // moderation queue (Phase 5) doesn't exist yet, so a PENDING entry
    // would never surface. Flip this back on once that UI ships (see
    // DECISIONS.md).
    update: { prizeText, moderationEnabled: false },
    create: {
      id: "demo-contest",
      name: "2026 Second Chance Pet Photo Contest",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      prizeText,
      moderationEnabled: false,
    },
  });

  for (const seed of SEED_ENTRIES) {
    const existing = await prisma.entry.findFirst({
      where: { contestId: contest.id, petName: seed.petName },
    });
    if (existing) {
      console.log(`Skipping ${seed.petName} — already seeded.`);
      continue;
    }

    const slug = await uniqueSlugForContest(contest.id, seed.petName);

    const entry = await prisma.entry.create({
      data: {
        contestId: contest.id,
        petName: seed.petName,
        caption: seed.caption,
        ownerName: seed.ownerName,
        ownerEmail: seed.ownerEmail,
        photoUrl: seed.photoUrl,
        slug,
        status: "APPROVED",
      },
    });

    for (const votes of seed.votePurchases) {
      await prisma.transaction.create({
        data: {
          contestId: contest.id,
          entryId: entry.id,
          type: "VOTE_PURCHASE",
          status: "SUCCEEDED",
          amountCents: votes * contest.votePriceCents,
          voteQuantity: votes,
          processor: "MOCK",
          processorRef: `seed-${entry.id}-${votes}-${Math.random().toString(36).slice(2, 8)}`,
          donorName: "Demo Supporter",
          donorEmail: "demo-supporter@example.com",
        },
      });
    }

    const total = await recomputeVoteCount(entry.id);
    console.log(`Seeded ${seed.petName} (/pet/${slug}) — ${total} votes.`);
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
