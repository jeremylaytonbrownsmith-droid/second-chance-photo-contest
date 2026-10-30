import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromSession } from "@/lib/admin/auth";
import { hashPassword } from "@/lib/admin/password";
import { logAdminAction } from "@/lib/admin/audit";
import { siteUrl } from "@/lib/site-url";

const newAdminSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(10, "Password must be at least 10 characters"),
});

/** Lets an existing SUPER_ADMIN add another admin login — the only way a
 * second admin account gets created, since there's no public signup by
 * design. Each admin logs in with their own email/password and goes
 * through the same mandatory passkey enrollment as the first admin did,
 * so every action in /admin/activity is attributable to a real person,
 * not a shared login. */
export async function POST(request: Request) {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.redirect(new URL("/admin/login", siteUrl()), 303);
  }
  if (admin.role !== "SUPER_ADMIN") {
    return errorRedirect("Only a super admin can add admin logins");
  }

  const formData = await request.formData();
  const parsed = newAdminSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return errorRedirect(parsed.error.issues[0]?.message ?? "Invalid admin");
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing && !existing.voidedAt) {
    return errorRedirect("That email already has an admin login");
  }

  const passwordHash = hashPassword(parsed.data.password);
  const newAdmin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, voidedAt: null, role: "MODERATOR" },
    create: { email, passwordHash, role: "MODERATOR" },
  });

  await logAdminAction({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: "ADMIN_USER_ADDED",
    targetType: "AdminUser",
    targetId: newAdmin.id,
    detail: email,
  });

  return NextResponse.redirect(new URL("/admin/users", siteUrl()), 303);
}

function errorRedirect(message: string): NextResponse {
  const url = new URL("/admin/users", siteUrl());
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}
