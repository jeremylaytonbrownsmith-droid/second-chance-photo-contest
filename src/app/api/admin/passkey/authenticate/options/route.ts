import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_MFA_PENDING_COOKIE, verifyMfaPendingToken, ADMIN_WEBAUTHN_CHALLENGE_COOKIE, createChallengeToken, PENDING_COOKIE_MAX_AGE_SECONDS } from "@/lib/admin/mfa-pending";
import { webauthnRpID } from "@/lib/admin/webauthn-config";

export async function GET() {
  const cookieStore = await cookies();
  const adminUserId = verifyMfaPendingToken(cookieStore.get(ADMIN_MFA_PENDING_COOKIE)?.value);
  if (!adminUserId) {
    return NextResponse.json({ error: "Sign in with your password first" }, { status: 401 });
  }

  const passkeys = await prisma.adminPasskey.findMany({ where: { adminUserId } });
  if (passkeys.length === 0) {
    return NextResponse.json({ error: "No passkey registered for this account" }, { status: 409 });
  }

  const options = await generateAuthenticationOptions({
    rpID: webauthnRpID(),
    allowCredentials: passkeys.map((p) => ({ id: p.credentialId })),
    userVerification: "preferred",
  });

  const response = NextResponse.json(options);
  response.cookies.set(ADMIN_WEBAUTHN_CHALLENGE_COOKIE, createChallengeToken(options.challenge), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
