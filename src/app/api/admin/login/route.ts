import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/admin/password";
import { ADMIN_SESSION_COOKIE, createSessionToken } from "@/lib/admin/session";
import { siteUrl } from "@/lib/site-url";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const admin = email ? await prisma.adminUser.findUnique({ where: { email } }) : null;
  const valid = admin && !admin.voidedAt && verifyPassword(password, admin.passwordHash);

  if (!valid || !admin) {
    const url = new URL("/admin/login", siteUrl());
    url.searchParams.set("error", "Invalid email or password");
    return NextResponse.redirect(url, 303);
  }

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
