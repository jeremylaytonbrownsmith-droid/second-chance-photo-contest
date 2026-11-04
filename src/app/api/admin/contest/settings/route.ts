import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromSession } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { siteUrl } from "@/lib/site-url";

// Dollar amounts come in as plain decimal strings from <input type="number">
// and get converted to cents here — the rest of the app only ever works in
// cents (CLAUDE.md: all money is integer cents, no floats).
function dollarsToCents(value: string): number {
  return Math.round(Number(value) * 100);
}

const settingsSchema = z.object({
  name: z.string().trim().min(1, "Contest name is required").max(120),
  startsAt: z.string().min(1, "Enter a start date/time"),
  endsAt: z.string().min(1, "Enter an end date/time"),
  entryFeeDollars: z.coerce.number().min(0, "Entry fee can't be negative"),
  votePriceDollars: z.coerce.number().min(0.01, "Vote price must be at least $0.01"),
  goalDollars: z.coerce.number().min(0, "Goal can't be negative"),
  moderationEnabled: z.literal("on").optional(),
  prizeText: z.string().trim().max(2000).optional().default(""),
});

export async function POST(request: Request) {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.redirect(new URL("/admin/login", siteUrl()), 303);
  }

  const formData = await request.formData();
  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    entryFeeDollars: formData.get("entryFeeDollars"),
    votePriceDollars: formData.get("votePriceDollars"),
    goalDollars: formData.get("goalDollars"),
    moderationEnabled: formData.get("moderationEnabled") ?? undefined,
    prizeText: formData.get("prizeText") ?? "",
  });
  if (!parsed.success) {
    return errorRedirect(parsed.error.issues[0]?.message ?? "Invalid settings");
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return errorRedirect("Enter valid dates");
  }
  if (endsAt <= startsAt) {
    return errorRedirect("The contest must end after it starts");
  }

  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });
  if (!contest) {
    return errorRedirect("No contest is configured");
  }

  await prisma.contest.update({
    where: { id: contest.id },
    data: {
      name: parsed.data.name,
      startsAt,
      endsAt,
      entryFeeCents: dollarsToCents(String(parsed.data.entryFeeDollars)),
      votePriceCents: dollarsToCents(String(parsed.data.votePriceDollars)),
      goalCents: dollarsToCents(String(parsed.data.goalDollars)),
      moderationEnabled: parsed.data.moderationEnabled === "on",
      prizeText: parsed.data.prizeText || null,
    },
  });

  await logAdminAction({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: "CONTEST_SETTINGS_UPDATED",
    targetType: "Contest",
    targetId: contest.id,
  });

  return NextResponse.redirect(new URL("/admin/settings?success=1", siteUrl()), 303);
}

function errorRedirect(message: string): NextResponse {
  const url = new URL("/admin/settings", siteUrl());
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}
