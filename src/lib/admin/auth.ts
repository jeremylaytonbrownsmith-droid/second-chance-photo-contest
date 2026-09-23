import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminUser } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "./session";

/** Reads and validates the admin session cookie without redirecting —
 * for Route Handlers, which need to send their own response (a redirect
 * or a 401), not the RSC-only redirect() that page components use. */
export async function getAdminFromSession(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const adminUserId = verifySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!adminUserId) return null;

  const admin = await prisma.adminUser.findUnique({ where: { id: adminUserId } });
  if (!admin || admin.voidedAt) return null;

  return admin;
}

/** Call at the top of any admin server component/page that must be behind
 * a login. Redirects to /admin/login if there's no valid session — never
 * returns null, so callers don't need to null-check. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminFromSession();
  if (!admin) redirect("/admin/login");
  return admin;
}
