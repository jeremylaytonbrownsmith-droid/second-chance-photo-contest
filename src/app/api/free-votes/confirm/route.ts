import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recomputeVoteCount } from "@/lib/entries";
import { siteUrl } from "@/lib/site-url";

const confirmSchema = z.object({
  entryId: z.string().min(1),
  entrySlug: z.string().min(1),
  email: z.email(),
  code: z.string().trim().min(1, "Enter the code from your email"),
});

function todayUtcDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Step 2 of the free vote — see /api/free-votes/request. Verifies the
 * emailed code, then logs one FreeVoteLog row (its unique index is the
 * real one-per-day enforcement, not just the pre-check in step 1, so a
 * race between two requests for the same email can't double-count). */
export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = confirmSchema.safeParse({
    entryId: formData.get("entryId"),
    entrySlug: formData.get("entrySlug"),
    email: formData.get("email"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return errorRedirect(formData.get("entrySlug"), formData.get("email"), parsed.error.issues[0]?.message ?? "Invalid submission");
  }
  const { entryId, entrySlug, email, code } = parsed.data;

  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry || entry.status !== "APPROVED" || entry.voidedAt) {
    return errorRedirect(entrySlug, email, "This entry isn't open for voting");
  }

  const verification = await prisma.emailVerification.findFirst({
    where: { email, code, purpose: "FREE_VOTE", verifiedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!verification) {
    return errorRedirect(entrySlug, email, "That code is invalid or expired — request a new one");
  }

  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: { verifiedAt: new Date() },
  });

  try {
    await prisma.freeVoteLog.create({
      data: { contestId: entry.contestId, entryId: entry.id, email, votedOn: todayUtcDate() },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorRedirect(entrySlug, email, "You've already used your free vote for this pet today — come back tomorrow!");
    }
    throw error;
  }

  await recomputeVoteCount(entry.id);

  const url = new URL(`/pet/${entrySlug}`, siteUrl());
  url.searchParams.set("freeVoted", "1");
  return NextResponse.redirect(url, 303);
}

function errorRedirect(entrySlugValue: FormDataEntryValue | null, emailValue: FormDataEntryValue | null, message: string): NextResponse {
  const slug = typeof entrySlugValue === "string" && entrySlugValue ? entrySlugValue : null;
  const url = new URL(slug ? `/pet/${slug}` : "/gallery", siteUrl());
  url.searchParams.set("freeVoteError", message);
  url.searchParams.set("freeVoteStep", "code");
  if (typeof emailValue === "string" && emailValue) url.searchParams.set("freeVoteEmail", emailValue);
  return NextResponse.redirect(url, 303);
}
