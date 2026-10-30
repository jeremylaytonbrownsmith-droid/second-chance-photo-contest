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
