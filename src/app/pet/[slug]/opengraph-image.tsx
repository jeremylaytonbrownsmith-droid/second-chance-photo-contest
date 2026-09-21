import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { getApprovedEntryBySlug } from "@/lib/entries";
import { theme } from "@/lib/theme";
import { siteUrl } from "@/lib/site-url";

export const alt = "Second Chance Pet Adoptions photo contest entry";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });
  const entry = contest ? await getApprovedEntryBySlug(contest.id, slug) : null;

  const photoUrl = entry
    ? entry.photoUrl.startsWith("/")
      ? `${siteUrl()}${entry.photoUrl}`
      : entry.photoUrl
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: theme.colors.accent,
        }}
      >
        {photoUrl && <img src={photoUrl} alt="" width={630} height={630} style={{ objectFit: "cover" }} />}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: "60px",
            gap: "16px",
          }}
        >
          <div style={{ fontSize: 24, color: theme.colors.primaryDark, fontWeight: 600, display: "flex" }}>
            {theme.org.name}
          </div>
          <div style={{ fontSize: 56, color: theme.colors.primary, fontWeight: 700, display: "flex" }}>
            {entry?.petName ?? "Vote for me!"}
          </div>
          {entry && (
            <div style={{ fontSize: 32, color: "#444", display: "flex" }}>
              {entry.voteCount.toLocaleString()} votes so far
            </div>
          )}
          <div style={{ fontSize: 24, color: "#666", marginTop: 16, display: "flex" }}>
            Vote in the pet photo contest
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
