import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site-url";

const reportSchema = z.object({
  reason: z.string().trim().min(1, "Tell us what's wrong with this photo").max(500),
});

/** No login required, by design — a bad photo should be reportable by
 * anyone who sees it. Immediately pulls the entry from public view
 * (status -> REPORTED); a human always decides what happens next from
 * the moderation queue, this never auto-disqualifies or deletes
 * anything. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await request.formData();
  const parsed = reportSchema.safeParse({ reason: formData.get("reason") });

  const entrySlug = String(formData.get("entrySlug") ?? "");
  if (!parsed.success) {
    return errorRedirect(entrySlug, parsed.error.issues[0]?.message ?? "Invalid report");
  }

  const entry = await prisma.entry.findUnique({ where: { id } });
  if (!entry) {
    return errorRedirect(entrySlug, "We couldn't find that entry");
  }

  await prisma.$transaction([
    prisma.entryReport.create({ data: { entryId: id, reason: parsed.data.reason } }),
    // Only pulls it if it was actually live — a report on a PENDING or
    // already-DISQUALIFIED entry is still logged, just doesn't change
    // its status.
    prisma.entry.updateMany({ where: { id, status: "APPROVED" }, data: { status: "REPORTED" } }),
  ]);

  const url = new URL("/gallery", siteUrl());
  url.searchParams.set("reported", "1");
  return NextResponse.redirect(url, 303);
}

function errorRedirect(entrySlug: string, message: string): NextResponse {
  const url = new URL(entrySlug ? `/pet/${entrySlug}` : "/gallery", siteUrl());
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}
