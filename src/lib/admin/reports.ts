import { prisma } from "@/lib/prisma";
import type { AnimalSpecies, EntryStatus } from "@prisma/client";

export interface EntryReportRow {
  entryId: string;
  petName: string;
  species: AnimalSpecies | null;
  status: EntryStatus;
  ownerName: string;
  ownerEmail: string;
  rescueSource: string | null;
  enteredAt: Date;
  voteCount: number;
  totalRaisedCents: number;
  shareApproved: boolean;
}

/** One row per entry with its total dollars raised (entry fee + every vote
 * purchase) — what the client asked for directly: "date of entry, entrant
 * name, email address, pet name, number of votes, number dollars."
 *
 * The dollar total comes from a single groupBy, not a per-entry query — at
 * contest scale (the client's explicit scaling concern from today's call)
 * an N+1 here would make this page slower every time entries grow, right
 * when it matters most. */
export async function getEntryReportRows(contestId: string): Promise<EntryReportRow[]> {
  const [entries, sums] = await Promise.all([
    prisma.entry.findMany({
      where: { contestId, voidedAt: null },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["entryId"],
      where: { contestId, status: "SUCCEEDED", entryId: { not: null } },
      _sum: { amountCents: true },
    }),
  ]);

  const totalsByEntry = new Map(sums.map((s) => [s.entryId as string, s._sum.amountCents ?? 0]));

  return entries.map((entry) => ({
    entryId: entry.id,
    petName: entry.petName,
    species: entry.species,
    status: entry.status,
    ownerName: entry.ownerName,
    ownerEmail: entry.ownerEmail,
    rescueSource: entry.rescueSource,
    enteredAt: entry.createdAt,
    voteCount: entry.voteCount,
    totalRaisedCents: totalsByEntry.get(entry.id) ?? 0,
    shareApproved: entry.shareApproved,
  }));
}

export interface DonorReportRow {
  donorName: string;
  donorEmail: string;
  giftCount: number;
  totalGivenCents: number;
  firstGiftAt: Date;
  lastGiftAt: Date;
}

/** One row per unique donor email — for the client to pull an email list of
 * everyone who gave money (entry fees and/or vote purchases), not just the
 * pet entrants `getEntryReportRows` covers. Grouped by email, not by name,
 * since email is the actual contact point and is what two different gifts
 * from the same person are matched on. */
export async function getDonorReportRows(contestId: string): Promise<DonorReportRow[]> {
  const transactions = await prisma.transaction.findMany({
    where: { contestId, status: "SUCCEEDED" },
    select: { donorName: true, donorEmail: true, amountCents: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const byEmail = new Map<string, DonorReportRow>();
  for (const t of transactions) {
    const key = t.donorEmail.trim().toLowerCase();
    const existing = byEmail.get(key);
    if (existing) {
      existing.giftCount += 1;
      existing.totalGivenCents += t.amountCents;
      existing.lastGiftAt = t.createdAt;
      // Most recent name on file for this email — donors occasionally typo
      // their name between gifts, and the latest entry is the best guess.
      existing.donorName = t.donorName;
    } else {
      byEmail.set(key, {
        donorName: t.donorName,
        donorEmail: t.donorEmail,
        giftCount: 1,
        totalGivenCents: t.amountCents,
        firstGiftAt: t.createdAt,
        lastGiftAt: t.createdAt,
      });
    }
  }

  return Array.from(byEmail.values()).sort((a, b) => b.totalGivenCents - a.totalGivenCents);
}

export function donorReportToCsv(rows: DonorReportRow[]): string {
  const header = ["Name", "Email", "Gifts", "Total given ($)", "First gift", "Most recent gift"];
  const lines = [header.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.donorName,
        row.donorEmail,
        String(row.giftCount),
        (row.totalGivenCents / 100).toFixed(2),
        row.firstGiftAt.toISOString(),
        row.lastGiftAt.toISOString(),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

function csvCell(value: string): string {
  // Quote whenever the value could otherwise break a column boundary or a
  // row boundary (comma, quote, or newline) — always-quoting would also be
  // correct but this keeps the common case readable in a quick open.
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function entryReportToCsv(rows: EntryReportRow[]): string {
  const header = [
    "Entry date",
    "Pet name",
    "Species",
    "Status",
    "Owner name",
    "Owner email",
    "Rescue source",
    "Votes",
    "Total raised ($)",
    "Sharing approved",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.enteredAt.toISOString(),
        row.petName,
        row.species ?? "",
        row.status,
        row.ownerName,
        row.ownerEmail,
        row.rescueSource ?? "",
        String(row.voteCount),
        (row.totalRaisedCents / 100).toFixed(2),
        row.shareApproved ? "Yes" : "No",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}
