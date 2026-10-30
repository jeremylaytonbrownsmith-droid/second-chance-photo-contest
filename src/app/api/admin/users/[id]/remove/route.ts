import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromSession } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { siteUrl } from "@/lib/site-url";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.redirect(new URL("/admin/login", siteUrl()), 303);
  }
  if (admin.role !== "SUPER_ADMIN") {
    return errorRedirect("Only a super admin can remove admin logins");
  }

  const { id } = await params;
  if (id === admin.id) {
    return errorRedirect("You can't remove your own admin login");
  }

  const target = await prisma.adminUser.update({
    where: { id },
    data: { voidedAt: new Date() },
  });

  await logAdminAction({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: "ADMIN_USER_REMOVED",
    targetType: "AdminUser",
    targetId: id,
    detail: target.email,
  });

  return NextResponse.redirect(new URL("/admin/users", siteUrl()), 303);
}

function errorRedirect(message: string): NextResponse {
  const url = new URL("/admin/users", siteUrl());
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}
