import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromSession } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { siteUrl } from "@/lib/site-url";

/** Restores a REPORTED entry back to APPROVED — the "the report wasn't
 * valid, put it back" outcome. Only works on REPORTED entries; a
 * DISQUALIFIED entry needs a deliberate separate decision, not a one-click
 * undo. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.redirect(new URL("/admin/login", siteUrl()), 303);
  }

  const { id } = await params;

  const result = await prisma.entry.updateMany({
    where: { id, status: "REPORTED" },
    data: { status: "APPROVED" },
  });

  if (result.count > 0) {
    await prisma.entryReport.updateMany({
      where: { entryId: id, resolvedAt: null },
      data: { resolvedAt: new Date(), resolution: "restored" },
    });

    await logAdminAction({
      adminUserId: admin.id,
      adminEmail: admin.email,
      action: "ENTRY_RESTORED",
      targetType: "Entry",
      targetId: id,
    });
  }

  return NextResponse.redirect(new URL("/admin/moderation", siteUrl()), 303);
}
