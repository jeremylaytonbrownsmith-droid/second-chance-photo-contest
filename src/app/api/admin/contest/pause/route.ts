import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromSession } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { siteUrl } from "@/lib/site-url";

/** The sitewide kill switch — pauses/resumes new entries, votes, and the
 * public gallery/leaderboard/pet pages in one action, for an active
 * incident where you need everything stopped right now. Operates on the
 * most recent contest, same "there's one current contest" assumption the
 * rest of the admin already makes. */
export async function POST(request: Request) {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.redirect(new URL("/admin/login", siteUrl()), 303);
  }

  const formData = await request.formData();
  const paused = formData.get("paused") === "1";
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });
  if (contest) {
    await prisma.contest.update({
      where: { id: contest.id },
      data: { galleryPaused: paused, galleryPausedReason: paused ? reason : null },
    });

    await logAdminAction({
      adminUserId: admin.id,
      adminEmail: admin.email,
      action: paused ? "CONTEST_PAUSED" : "CONTEST_RESUMED",
      targetType: "Contest",
      targetId: contest.id,
      detail: reason ?? undefined,
    });
  }

  return NextResponse.redirect(new URL("/admin/dashboard", siteUrl()), 303);
}
