import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/admin/password";
import { ADMIN_SESSION_COOKIE, createSessionToken } from "@/lib/admin/session";
import { ADMIN_MFA_PENDING_COOKIE, createMfaPendingToken, PENDING_COOKIE_MAX_AGE_SECONDS } from "@/lib/admin/mfa-pending";
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

  // Emergency bypass — an env var escape hatch (not a toggle in the UI on
  // purpose) in case the passkey step itself breaks and locks out the one
  // admin account with no self-serve recovery path yet. Logged so a bypass
  // is visible after the fact, not silent.
  if (process.env.ADMIN_DISABLE_PASSKEY_MFA === "true") {
    await logAdminAction({ adminUserId: admin.id, adminEmail: email, action: "LOGIN_SUCCESS_MFA_BYPASSED" });
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

  await logAdminAction({ adminUserId: admin.id, adminEmail: email, action: "PASSWORD_VERIFIED" });

  const passkeyCount = await prisma.adminPasskey.count({ where: { adminUserId: admin.id } });
  const nextStep = passkeyCount === 0 ? "/admin/login/setup-passkey" : "/admin/login/passkey";

  const response = NextResponse.redirect(new URL(nextStep, siteUrl()), 303);
  response.cookies.set(ADMIN_MFA_PENDING_COOKIE, createMfaPendingToken(admin.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // Needs to reach both /admin/login/(setup-)passkey (the pages) and
    // /api/admin/passkey/* (the routes they call) — no shared prefix
    // shorter than "/", same as the real session cookie's scope.
    path: "/",
    maxAge: PENDING_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

function errorRedirect(message: string): NextResponse {
  const url = new URL("/admin/login", siteUrl());
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}
