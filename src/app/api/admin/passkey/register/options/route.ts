import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_MFA_PENDING_COOKIE, verifyMfaPendingToken, ADMIN_WEBAUTHN_CHALLENGE_COOKIE, createChallengeToken, PENDING_COOKIE_MAX_AGE_SECONDS } from "@/lib/admin/mfa-pending";
import { webauthnRpID, WEBAUTHN_RP_NAME } from "@/lib/admin/webauthn-config";

export async function GET() {
  const cookieStore = await cookies();
  const adminUserId = verifyMfaPendingToken(cookieStore.get(ADMIN_MFA_PENDING_COOKIE)?.value);
  if (!adminUserId) {
    return NextResponse.json({ error: "Sign in with your password first" }, { status: 401 });
  }

  const admin = await prisma.adminUser.findUnique({ where: { id: adminUserId } });
  if (!admin) {
    return NextResponse.json({ error: "Account not found" }, { status: 401 });
  }

  const existing = await prisma.adminPasskey.findMany({ where: { adminUserId } });

  const options = await generateRegistrationOptions({
    rpName: WEBAUTHN_RP_NAME,
    rpID: webauthnRpID(),
    userName: admin.email,
    userID: Buffer.from(admin.id, "utf8"),
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({ id: p.credentialId })),
    authenticatorSelection: {
      userVerification: "preferred",
      residentKey: "preferred",
    },
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
