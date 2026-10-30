import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getEmailProvider } from "@/lib/email";
import { siteUrl } from "@/lib/site-url";

const CODE_TTL_MINUTES = 10;

const requestSchema = z.object({
  entryId: z.string().min(1),
  entrySlug: z.string().min(1),
  email: z.email("Enter a valid email"),
});

function todayUtcDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Step 1 of the no-purchase-necessary free vote (CLAUDE.md rule 7/8): a
 * visitor who doesn't want to pay can still vote once a day, for free, per
 * entry — verified by email so it can't just be refreshed for unlimited
 * votes. This sends a one-time code; /api/free-votes/confirm checks it. */
export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = requestSchema.safeParse({
    entryId: formData.get("entryId"),
    entrySlug: formData.get("entrySlug"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return errorRedirect(formData.get("entrySlug"), parsed.error.issues[0]?.message ?? "Invalid submission");
  }
  const { entryId, entrySlug, email } = parsed.data;

  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry || entry.status !== "APPROVED" || entry.voidedAt) {
    return errorRedirect(entrySlug, "This entry isn't open for voting");
  }

  const contest = await prisma.contest.findUnique({ where: { id: entry.contestId } });
  if (!contest || !contest.freeVoteEnabled) {
    return errorRedirect(entrySlug, "Free voting isn't available for this contest");
  }
  if (contest.galleryPaused) {
    return errorRedirect(entrySlug, "Voting is temporarily paused — please check back soon");
  }

  const alreadyVotedToday = await prisma.freeVoteLog.findUnique({
    where: {
      contestId_entryId_email_votedOn: {
        contestId: contest.id,
        entryId: entry.id,
        email,
        votedOn: todayUtcDate(),
      },
    },
  });
  if (alreadyVotedToday) {
    return errorRedirect(entrySlug, "You've already used your free vote for this pet today — come back tomorrow!");
  }

  const code = generateCode();
  await prisma.emailVerification.create({
    data: {
      email,
      code,
      purpose: "FREE_VOTE",
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
    },
  });

  try {
    await getEmailProvider().send({
      to: email,
      subject: `Your free vote code for ${entry.petName}`,
      html: `<p>Your one-time code is <strong>${code}</strong>. It expires in ${CODE_TTL_MINUTES} minutes.</p><p>Enter it on ${entry.petName}'s page to cast your free vote — no purchase necessary.</p>`,
      text: `Your one-time code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. Enter it on ${entry.petName}'s page to cast your free vote — no purchase necessary.`,
    });
  } catch {
    return errorRedirect(entrySlug, "Couldn't send the code — try again in a moment");
  }

  const url = new URL(`/pet/${entrySlug}`, siteUrl());
  url.searchParams.set("freeVoteStep", "code");
  url.searchParams.set("freeVoteEmail", email);
  return NextResponse.redirect(url, 303);
}

function errorRedirect(entrySlugValue: FormDataEntryValue | null, message: string): NextResponse {
  const slug = typeof entrySlugValue === "string" && entrySlugValue ? entrySlugValue : null;
  const url = new URL(slug ? `/pet/${slug}` : "/gallery", siteUrl());
  url.searchParams.set("freeVoteError", message);
  return NextResponse.redirect(url, 303);
}
