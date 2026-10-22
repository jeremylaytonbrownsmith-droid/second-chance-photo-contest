import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
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

  const body = (await request.json()) as AuthenticationResponseJSON;

  const passkey = await prisma.adminPasskey.findUnique({ where: { credentialId: body.id } });
  if (!passkey || passkey.adminUserId !== adminUserId) {
    await logAdminAction({ adminUserId, adminEmail: admin.email, action: "PASSKEY_LOGIN_FAILED", detail: "unknown credential" });
    return NextResponse.json({ error: "That passkey isn't recognized" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: webauthnOrigin(),
      expectedRPID: webauthnRpID(),
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
      },
    });
  } catch {
    await logAdminAction({ adminUserId, adminEmail: admin.email, action: "PASSKEY_LOGIN_FAILED" });
    return NextResponse.json({ error: "That passkey couldn't be verified — try again" }, { status: 400 });
  }

  if (!verification.verified) {
    await logAdminAction({ adminUserId, adminEmail: admin.email, action: "PASSKEY_LOGIN_FAILED" });
    return NextResponse.json({ error: "That passkey couldn't be verified — try again" }, { status: 400 });
  }

  await prisma.adminPasskey.update({
    where: { id: passkey.id },
    data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
  });

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
