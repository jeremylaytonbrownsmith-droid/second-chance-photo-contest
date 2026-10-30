import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "scpc_vid";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Anonymous, cookie-deduped visit counter for the admin dashboard's "how
 * many people have been on the site today" — see the PageVisit model
 * comment in schema.prisma for why this exists instead of a Google
 * Analytics Data API integration. */
export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const existingId = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))?.[1];
  const visitorId = existingId ?? randomUUID();
  const day = todayUtc();

  await prisma.pageVisit.upsert({
    where: { day_visitorId: { day, visitorId } },
    update: {},
    create: { day, visitorId },
  });

  const response = new NextResponse(null, { status: 204 });
  if (!existingId) {
    response.cookies.set(COOKIE_NAME, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR_SECONDS,
      path: "/",
    });
  }
  return response;
}
