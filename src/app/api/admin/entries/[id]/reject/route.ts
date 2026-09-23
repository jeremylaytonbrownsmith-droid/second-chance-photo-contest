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
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    const url = new URL("/admin/moderation", siteUrl());
    url.searchParams.set("error", "A reason is required to reject an entry");
    return NextResponse.redirect(url, 303);
  }

  await prisma.entry.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "REJECTED", moderationNote: reason },
  });

  return NextResponse.redirect(new URL("/admin/moderation", siteUrl()), 303);
}
