import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromSession } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { siteUrl } from "@/lib/site-url";

/** The per-photo kill switch — pulls any live entry (APPROVED or
 * REPORTED) from public view immediately. Never deletes it (CLAUDE.md
 * rule 4) — the photo, the entry, every vote and transaction on it stays
 * in the database, just no longer publicly visible. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.redirect(new URL("/admin/login", siteUrl()), 303);
  }

  const { id } = await params;
  const formData = await request.formData();
  const reason = String(formData.get("reason") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/admin/reports");

  if (!reason) {
    const url = new URL(redirectTo, siteUrl());
    url.searchParams.set("error", "A reason is required to pull an entry");
    return NextResponse.redirect(url, 303);
  }

  const result = await prisma.entry.updateMany({
    where: { id, status: { in: ["APPROVED", "REPORTED"] } },
    data: { status: "DISQUALIFIED", disqualifiedReason: reason },
  });

  if (result.count > 0) {
    await prisma.entryReport.updateMany({
      where: { entryId: id, resolvedAt: null },
      data: { resolvedAt: new Date(), resolution: "disqualified" },
    });

    await logAdminAction({
      adminUserId: admin.id,
      adminEmail: admin.email,
      action: "ENTRY_DISQUALIFIED",
      targetType: "Entry",
      targetId: id,
      detail: reason,
    });
  }

  return NextResponse.redirect(new URL(redirectTo, siteUrl()), 303);
}
