import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromSession } from "@/lib/admin/auth";
import { getEntryReportRows, entryReportToCsv } from "@/lib/admin/reports";
import { logAdminAction } from "@/lib/admin/audit";

export async function GET() {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });
  const rows = contest ? await getEntryReportRows(contest.id) : [];
  const csv = entryReportToCsv(rows);

  await logAdminAction({ adminUserId: admin.id, adminEmail: admin.email, action: "REPORT_EXPORTED" });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="entries-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
