import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_MFA_PENDING_COOKIE,
  ADMIN_WEBAUTHN_CHALLENGE_COOKIE,
  verifyMfaPendingToken,
  verifyChallengeToken,
} from "@/lib/admin/mfa-pending";
import { webauthnRpID, webauthnOrigin } from "@/lib/admin/webauthn-config";
import { ADMIN_SESSION_COOKIE, createSessionToken } from "@/lib/admin/session";
import { logAdminAction } from "@/lib/admin/audit";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const adminUserId = verifyMfaPendingToken(cookieStore.get(ADMIN_MFA_PENDING_COOKIE)?.value);
  const expectedChallenge = verifyChallengeToken(cookieStore.get(ADMIN_WEBAUTHN_CHALLENGE_COOKIE)?.value);
  if (!adminUserId || !expectedChallenge) {
    return NextResponse.json({ error: "Your sign-in session expired — start over" }, { status: 401 });
  }

  const admin = await prisma.adminUser.findUnique({ where: { id: adminUserId } });
  if (!admin) {
    return NextResponse.json({ error: "Account not found" }, { status: 401 });
  }

  const body = (await request.json()) as RegistrationResponseJSON;

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: webauthnOrigin(),
      expectedRPID: webauthnRpID(),
    });
  } catch {
    await logAdminAction({ adminUserId, adminEmail: admin.email, action: "PASSKEY_REGISTER_FAILED" });
    return NextResponse.json({ error: "That passkey couldn't be verified — try again" }, { status: 400 });
  }

  if (!verification.verified) {
    await logAdminAction({ adminUserId, adminEmail: admin.email, action: "PASSKEY_REGISTER_FAILED" });
    return NextResponse.json({ error: "That passkey couldn't be verified — try again" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;
  await prisma.adminPasskey.create({
    data: {
      adminUserId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
    },
  });

  await logAdminAction({ adminUserId, adminEmail: admin.email, action: "PASSKEY_REGISTERED" });
  await logAdminAction({ adminUserId, adminEmail: admin.email, action: "LOGIN_SUCCESS" });

  const response = NextResponse.json({ ok: true, redirect: "/admin/moderation" });
  response.cookies.set(ADMIN_SESSION_COOKIE, createSessionToken(admin.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  response.cookies.delete(ADMIN_MFA_PENDING_COOKIE);
  response.cookies.delete(ADMIN_WEBAUTHN_CHALLENGE_COOKIE);
  return response;
}
