import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/session";
import { siteUrl } from "@/lib/site-url";

export async function POST() {
  const response = NextResponse.redirect(new URL("/admin/login", siteUrl()), 303);
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
