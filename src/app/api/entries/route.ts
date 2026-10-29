import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";
import { slugify, uniqueSlugForContest } from "@/lib/entries";
import { getPaymentProvider } from "@/lib/payments";
import { siteUrl } from "@/lib/site-url";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // safety net — the client resizes before upload

const entrySchema = z.object({
  petName: z.string().trim().min(1, "Pet name is required").max(80),
  ownerName: z.string().trim().min(1, "Your name is required").max(120),
  ownerEmail: z.email("Enter a valid email"),
  caption: z.string().trim().max(500).optional().default(""),
});

/** Entry submission — creates a PENDING Entry + ENTRY_FEE Transaction, then
 * redirects to the payment provider's hosted checkout. Nothing here marks
 * the entry live; only /api/payments/confirm does that, after the
 * processor confirms payment (never trust the initial submit alone — see
 * CLAUDE.md rule 3, every mutation that touches money gets an audit row). */
export async function POST(request: Request) {
  const formData = await request.formData();

  const parsed = entrySchema.safeParse({
    petName: formData.get("petName"),
    ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"),
    caption: formData.get("caption") ?? "",
  });
  if (!parsed.success) {
    return errorRedirect(parsed.error.issues[0]?.message ?? "Invalid submission");
  }

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return errorRedirect("A photo is required");
  }
  if (!photo.type.startsWith("image/")) {
    return errorRedirect("The uploaded file must be an image");
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return errorRedirect("Photo is too large — please use a smaller image");
  }

  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });
  if (!contest) {
    return errorRedirect("Entries are not open right now");
  }

  const { petName, ownerName, ownerEmail, caption } = parsed.data;

  const buffer = Buffer.from(await photo.arrayBuffer());
  const { url: photoUrl } = await getStorageProvider().upload({
    key: `entries/${contest.id}/${slugify(petName)}-${Date.now()}.jpg`,
    buffer,
    contentType: photo.type,
  });

  // uniqueSlugForContest checks-then-creates, which isn't atomic — under
  // concurrent submissions for the same pet name (e.g. a launch-day rush),
  // two requests can both pass the check before either inserts, and the
  // second hits the @@unique([contestId, slug]) constraint. Retry with a
  // fresh slug instead of surfacing that as a 500 to someone just trying
  // to enter their pet.
  const entry = await createEntryWithUniqueSlug({
    contestId: contest.id,
    petName,
    caption,
    ownerName,
    ownerEmail,
    photoUrl,
  });

  const transaction = await prisma.transaction.create({
    data: {
      contestId: contest.id,
      entryId: entry.id,
      type: "ENTRY_FEE",
      status: "PENDING",
      amountCents: contest.entryFeeCents,
      processor: getPaymentProvider().name,
      donorName: ownerName,
      donorEmail: ownerEmail,
    },
  });

  const base = siteUrl();
  const session = await getPaymentProvider().createCheckoutSession({
    amountCents: contest.entryFeeCents,
    description: `${contest.name} — entry fee for ${petName}`,
    successUrl: `${base}/api/payments/confirm`,
    cancelUrl: `${base}/enter?canceled=1`,
    customerEmail: ownerEmail,
    metadata: { transactionId: transaction.id },
  });

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { processorRef: session.id },
  });

  return NextResponse.redirect(new URL(session.url, base), 303);
}

function errorRedirect(message: string): NextResponse {
  const url = new URL("/enter", siteUrl());
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}

const MAX_SLUG_RETRIES = 3;

async function createEntryWithUniqueSlug(input: {
  contestId: string;
  petName: string;
  caption: string;
  ownerName: string;
  ownerEmail: string;
  photoUrl: string;
}) {
  for (let attempt = 0; attempt <= MAX_SLUG_RETRIES; attempt += 1) {
    const slug = await uniqueSlugForContest(input.contestId, input.petName);
    try {
      return await prisma.entry.create({
        data: {
          contestId: input.contestId,
          petName: input.petName,
          caption: input.caption,
          ownerName: input.ownerName,
          ownerEmail: input.ownerEmail,
          photoUrl: input.photoUrl,
          slug,
          status: "PENDING",
        },
      });
    } catch (error) {
      const isSlugCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        (error.meta?.target as string[] | undefined)?.includes("slug");
      if (!isSlugCollision || attempt === MAX_SLUG_RETRIES) throw error;
      // Loop again — uniqueSlugForContest will see the slug that just won
      // the race and pick a different one.
    }
  }
  throw new Error("Could not create entry — too many concurrent submissions for this pet name");
}
