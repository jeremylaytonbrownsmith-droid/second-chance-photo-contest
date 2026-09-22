import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";
import { uniqueSlugForContest } from "@/lib/entries";
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
 * the entry live; only /api/entries/confirm does that, after the processor
 * confirms payment (never trust the initial submit alone — see
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
  const slug = await uniqueSlugForContest(contest.id, petName);
  const key = `entries/${contest.id}/${slug}-${Date.now()}.jpg`;
  const { url: photoUrl } = await getStorageProvider().upload({
    key,
    buffer,
    contentType: photo.type,
  });

  const entry = await prisma.entry.create({
    data: {
      contestId: contest.id,
      petName,
      caption,
      ownerName,
      ownerEmail,
      photoUrl,
      slug,
      status: "PENDING",
    },
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
    successUrl: `${base}/api/entries/confirm`,
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
