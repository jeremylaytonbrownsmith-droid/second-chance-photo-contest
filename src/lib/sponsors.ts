import { prisma } from "@/lib/prisma";
import type { Sponsor } from "@prisma/client";

export interface GroupedSponsors {
  featured: Sponsor[];
  supporter: Sponsor[];
}

export async function getActiveSponsors(contestId: string): Promise<GroupedSponsors> {
  const sponsors = await prisma.sponsor.findMany({
    where: { contestId, voidedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return {
    featured: sponsors.filter((s) => s.tier === "FEATURED"),
    supporter: sponsors.filter((s) => s.tier === "SUPPORTER"),
  };
}
