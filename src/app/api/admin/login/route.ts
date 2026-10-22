import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/admin/password";
import { ADMIN_SESSION_COOKIE, createSessionToken } from "@/lib/admin/session";
import { logAdminAction } from "@/lib/admin/audit";
import { siteUrl } from "@/lib/site-url";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const admin = email ? await prisma.adminUser.findUnique({ where: { email } }) : null;

  // Locked out — reject without even checking the password, both so a
  // correct-but-still-locked-out attempt can't slip through and so the
  // lockout window can't be probed via response-time differences.
  if (admin?.lockedUntil && admin.lockedUntil > new Date()) {
    await logAdminAction({
      adminUserId: admin.id,
      adminEmail: email,
      action: "LOGIN_BLOCKED_LOCKED",
    });
    return errorRedirect("Too many failed attempts — try again in a few minutes");
  }

  const valid = admin && !admin.voidedAt && verifyPassword(password, admin.passwordHash);

  if (!valid || !admin) {
    if (admin) {
      const attempts = admin.failedLoginAttempts + 1;
      const lockedOut = attempts >= MAX_FAILED_ATTEMPTS;
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: {
          failedLoginAttempts: lockedOut ? 0 : attempts,
          lockedUntil: lockedOut ? new Date(Date.now() + LOCKOUT_MS) : null,
        },
      });
      await logAdminAction({
        adminUserId: admin.id,
        adminEmail: email,
        action: lockedOut ? "LOGIN_LOCKED" : "LOGIN_FAILED",
        detail: `attempt ${attempts} of ${MAX_FAILED_ATTEMPTS}`,
      });
      if (lockedOut) {
        return errorRedirect("Too many failed attempts — account locked for 15 minutes");
      }
    } else {
      await logAdminAction({ adminEmail: email, action: "LOGIN_FAILED_UNKNOWN_EMAIL" });
    }
    return errorRedirect("Invalid email or password");
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
  await logAdminAction({ adminUserId: admin.id, adminEmail: email, action: "LOGIN_SUCCESS" });

  const response = NextResponse.redirect(new URL("/admin/moderation", siteUrl()), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, createSessionToken(admin.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

function errorRedirect(message: string): NextResponse {
  const url = new URL("/admin/login", siteUrl());
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}
