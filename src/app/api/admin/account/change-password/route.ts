import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromSession } from "@/lib/admin/auth";
import { hashPassword, verifyPassword } from "@/lib/admin/password";
import { logAdminAction } from "@/lib/admin/audit";
import { siteUrl } from "@/lib/site-url";

const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(10, "New password must be at least 10 characters"),
});

/** Lets a logged-in admin set their own password — the piece that was
 * missing when a SUPER_ADMIN had to hand someone a temporary password
 * with no way for them to ever change it themselves. Requires the current
 * password (not just an active session) so a hijacked-but-unlocked
 * browser tab can't silently lock the real owner out. */
export async function POST(request: Request) {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.redirect(new URL("/admin/login", siteUrl()), 303);
  }

  const formData = await request.formData();
  const parsed = schema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return errorRedirect(parsed.error.issues[0]?.message ?? "Invalid password");
  }

  if (!verifyPassword(parsed.data.currentPassword, admin.passwordHash)) {
    return errorRedirect("Current password is incorrect");
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash: hashPassword(parsed.data.newPassword) },
  });

  await logAdminAction({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: "PASSWORD_CHANGED",
  });

  const url = new URL("/admin/account", siteUrl());
  url.searchParams.set("success", "1");
  return NextResponse.redirect(url, 303);
}

function errorRedirect(message: string): NextResponse {
  const url = new URL("/admin/account", siteUrl());
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}
