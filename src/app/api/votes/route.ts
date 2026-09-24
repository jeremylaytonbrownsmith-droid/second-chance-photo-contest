import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateCustomVoteCount } from "@/lib/pricing";
import { getPaymentProvider } from "@/lib/payments";
import { siteUrl } from "@/lib/site-url";

const voteSchema = z.object({
  entryId: z.string().min(1),
  donorName: z.string().trim().min(1, "Your name is required").max(120),
  donorEmail: z.email("Enter a valid email"),
  votes: z.coerce.number(),
});

/** Vote purchase — creates a PENDING VOTE_PURCHASE Transaction, then
 * redirects to the payment provider's hosted checkout. The vote only
 * counts (Entry.voteCount recomputed) once /api/payments/confirm hears
 * back from the processor that it was actually paid. */
export async function POST(request: Request) {
  const formData = await request.formData();

  const parsed = voteSchema.safeParse({
    entryId: formData.get("entryId"),
    donorName: formData.get("donorName"),
    donorEmail: formData.get("donorEmail"),
    votes: formData.get("votes"),
  });
  if (!parsed.success) {
    return errorRedirect(formData.get("entrySlug"), parsed.error.issues[0]?.message ?? "Invalid submission");
  }

  const { entryId, donorName, donorEmail, votes } = parsed.data;

  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry || entry.status !== "APPROVED" || entry.voidedAt) {
    return errorRedirect(formData.get("entrySlug"), "This entry isn't open for voting");
  }

  const contest = await prisma.contest.findUnique({ where: { id: entry.contestId } });
  if (!contest) {
    return errorRedirect(entry.slug, "This contest is no longer available");
  }

  const validated = validateCustomVoteCount(votes, contest.votePriceCents);
  if (!validated.ok) {
    return errorRedirect(entry.slug, validated.error);
  }

  const transaction = await prisma.transaction.create({
    data: {
      contestId: contest.id,
      entryId: entry.id,
      type: "VOTE_PURCHASE",
      status: "PENDING",
      amountCents: validated.priceCents,
      voteQuantity: votes,
      processor: getPaymentProvider().name,
      donorName,
      donorEmail,
    },
  });

  const base = siteUrl();
  const session = await getPaymentProvider().createCheckoutSession({
    amountCents: validated.priceCents,
    description: `${votes} vote${votes === 1 ? "" : "s"} for ${entry.petName}`,
    successUrl: `${base}/api/payments/confirm`,
    cancelUrl: `${base}/pet/${entry.slug}?vote_canceled=1`,
    customerEmail: donorEmail,
    metadata: { transactionId: transaction.id },
  });

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { processorRef: session.id },
  });

  return NextResponse.redirect(new URL(session.url, base), 303);
}

function errorRedirect(entrySlugValue: FormDataEntryValue | null, message: string): NextResponse {
  const slug = typeof entrySlugValue === "string" && entrySlugValue ? entrySlugValue : null;
  const url = new URL(slug ? `/pet/${slug}` : "/gallery", siteUrl());
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}
