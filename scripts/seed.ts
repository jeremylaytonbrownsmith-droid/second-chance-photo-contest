/**
 * Demo/dev seed — creates one contest, real entries built from the two
 * photos in scripts/seed-photos/, and enough SUCCEEDED vote transactions to
 * populate a working leaderboard. Not run in production (no seed step in
 * the build script) — for local dev and client demos only.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { getStorageProvider } from "../src/lib/storage";
import { uniqueSlugForContest, recomputeVoteCount } from "../src/lib/entries";

const SEED_PHOTOS_DIR = path.join(process.cwd(), "scripts", "seed-photos");

interface SeedEntry {
  file: string;
  petName: string;
  ownerName: string;
  ownerEmail: string;
  caption: string;
  votePurchases: number[]; // one Transaction per array entry, each SUCCEEDED
}

const SEED_ENTRIES: SeedEntry[] = [
  {
    file: "1.jpg",
    petName: "Biscuit",
    ownerName: "Dana Whitfield",
    ownerEmail: "dana.whitfield@example.com",
    caption: "Biscuit loves a good car ride with the windows cracked and the wind in her ears.",
    votePurchases: [25, 10, 50, 5, 100, 20],
  },
  {
    file: "2.jpg",
    petName: "Rusty",
    ownerName: "Marcus Delgado",
    ownerEmail: "marcus.delgado@example.com",
    caption: "Rusty exploring the city on a warm evening walk.",
    votePurchases: [10, 10, 5],
  },
];

async function main() {
  const contest = await prisma.contest.upsert({
    where: { id: "demo-contest" },
    update: {},
    create: {
      id: "demo-contest",
      name: "2026 Second Chance Pet Photo Contest",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      prizeText: "Grand prize winner gets their pet's photo on a limited-edition Second Chance beer can.",
    },
  });

  const storage = getStorageProvider();

  for (const seed of SEED_ENTRIES) {
    const existing = await prisma.entry.findFirst({
      where: { contestId: contest.id, petName: seed.petName },
    });
    if (existing) {
      console.log(`Skipping ${seed.petName} — already seeded.`);
      continue;
    }

    const buffer = await readFile(path.join(SEED_PHOTOS_DIR, seed.file));
    const key = `entries/${contest.id}-${seed.file}`;
    const { url } = await storage.upload({ key, buffer, contentType: "image/jpeg" });

    const slug = await uniqueSlugForContest(contest.id, seed.petName);

    const entry = await prisma.entry.create({
      data: {
        contestId: contest.id,
        petName: seed.petName,
        caption: seed.caption,
        ownerName: seed.ownerName,
        ownerEmail: seed.ownerEmail,
        photoUrl: url,
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
