import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromSession } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { siteUrl } from "@/lib/site-url";

/** Toggles whether an entry's share buttons + QR code are live on its
 * public pet page — the admin "accept, reject... that you want to share
 * on social media" step described on the call, kept separate from the
 * moderation approve/reject that gets an entry into the gallery at all. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.redirect(new URL("/admin/login", siteUrl()), 303);
  }

  const { id } = await params;
  const formData = await request.formData();
  const approved = formData.get("approved") === "1";

  const entry = await prisma.entry.update({
    where: { id },
    data: { shareApproved: approved },
  });

  await logAdminAction({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: approved ? "ENTRY_SHARE_APPROVED" : "ENTRY_SHARE_REVOKED",
    targetType: "Entry",
    targetId: id,
    detail: entry.petName,
  });

  return NextResponse.redirect(new URL("/admin/reports", siteUrl()), 303);
}
