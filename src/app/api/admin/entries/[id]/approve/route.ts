import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromSession } from "@/lib/admin/auth";
import { siteUrl } from "@/lib/site-url";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.redirect(new URL("/admin/login", siteUrl()), 303);
  }

  const { id } = await params;
  const formData = await request.formData();
  const note = String(formData.get("note") ?? "").trim() || null;

  // updateMany (not update) so this is a no-op instead of an error if the
  // entry was already handled — e.g. a double click, or two admins acting
  // on the same queue at once.
  await prisma.entry.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "APPROVED", moderationNote: note },
  });

  return NextResponse.redirect(new URL("/admin/moderation", siteUrl()), 303);
}
