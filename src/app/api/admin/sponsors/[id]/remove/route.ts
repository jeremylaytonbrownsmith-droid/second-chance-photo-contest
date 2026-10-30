import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromSession } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { siteUrl } from "@/lib/site-url";

/** Soft delete only — CLAUDE.md rule 4. A sponsor who steps back one year
 * may come back the next, and the record of who sponsored when shouldn't
 * just vanish either way. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.redirect(new URL("/admin/login", siteUrl()), 303);
  }

  const { id } = await params;
  const sponsor = await prisma.sponsor.update({
    where: { id },
    data: { voidedAt: new Date(), voidReason: "Removed by admin" },
  });

  await logAdminAction({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: "SPONSOR_REMOVED",
    targetType: "Sponsor",
    targetId: id,
    detail: sponsor.name,
  });

  return NextResponse.redirect(new URL("/admin/sponsors", siteUrl()), 303);
}
