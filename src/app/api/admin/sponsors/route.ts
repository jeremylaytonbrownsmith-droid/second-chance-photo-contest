import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromSession } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { getStorageProvider } from "@/lib/storage";
import { slugify } from "@/lib/entries";
import { siteUrl } from "@/lib/site-url";

const MAX_LOGO_BYTES = 4 * 1024 * 1024;

const sponsorSchema = z.object({
  name: z.string().trim().min(1, "Sponsor name is required").max(120),
  linkUrl: z.url("Enter a valid URL").optional().or(z.literal("")),
  tier: z.enum(["FEATURED", "SUPPORTER"]),
});

export async function POST(request: Request) {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.redirect(new URL("/admin/login", siteUrl()), 303);
  }

  const formData = await request.formData();
  const parsed = sponsorSchema.safeParse({
    name: formData.get("name"),
    linkUrl: formData.get("linkUrl") ?? "",
    tier: formData.get("tier"),
  });
  if (!parsed.success) {
    return errorRedirect(parsed.error.issues[0]?.message ?? "Invalid sponsor");
  }

  const logo = formData.get("logo");
  if (!(logo instanceof File) || logo.size === 0) {
    return errorRedirect("A logo image is required");
  }
  if (!logo.type.startsWith("image/")) {
    return errorRedirect("The logo must be an image");
  }
  if (logo.size > MAX_LOGO_BYTES) {
    return errorRedirect("Logo is too large — please use a smaller image");
  }

  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });
  if (!contest) {
    return errorRedirect("No contest is configured");
  }

  const { name, linkUrl, tier } = parsed.data;

  const buffer = Buffer.from(await logo.arrayBuffer());
  const { url: logoUrl } = await getStorageProvider().upload({
    key: `sponsors/${contest.id}/${slugify(name)}-${Date.now()}.jpg`,
    buffer,
    contentType: logo.type,
  });

  const sponsor = await prisma.sponsor.create({
    data: { contestId: contest.id, name, logoUrl, linkUrl: linkUrl || null, tier },
  });

  await logAdminAction({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action: "SPONSOR_ADDED",
    targetType: "Sponsor",
    targetId: sponsor.id,
    detail: name,
  });

  return NextResponse.redirect(new URL("/admin/sponsors", siteUrl()), 303);
}

function errorRedirect(message: string): NextResponse {
  const url = new URL("/admin/sponsors", siteUrl());
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}
