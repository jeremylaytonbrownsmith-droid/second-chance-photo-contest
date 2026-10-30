import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/auth";
import { getEntryReportRows } from "@/lib/admin/reports";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireAdmin();

  const contest = await prisma.contest.findFirst({ orderBy: { startsAt: "desc" } });
  const rows = contest ? await getEntryReportRows(contest.id) : [];

  const totalRaisedCents = rows.reduce((sum, row) => sum + row.totalRaisedCents, 0);
  const totalVotes = rows.reduce((sum, row) => sum + row.voteCount, 0);

  return (
    <main className="flex-1 bg-neutral-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
          <a
            href="/api/admin/reports/export"
            className="w-fit whitespace-nowrap rounded-md bg-brand-primary px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-primary-dark"
          >
            Download CSV
          </a>
        </div>

        {!contest ? (
          <p className="text-neutral-500">No contest is configured.</p>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-3 divide-x divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
              <div className="p-4 text-center">
                <p className="text-2xl font-bold text-neutral-900">{rows.length}</p>
                <p className="text-xs text-neutral-500">entries</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-2xl font-bold text-neutral-900">{totalVotes.toLocaleString()}</p>
                <p className="text-xs text-neutral-500">votes</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-2xl font-bold text-neutral-900">${(totalRaisedCents / 100).toLocaleString()}</p>
                <p className="text-xs text-neutral-500">raised</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Entered</th>
                    <th className="px-4 py-2 font-medium">Pet</th>
                    <th className="px-4 py-2 font-medium">Owner</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Votes</th>
                    <th className="px-4 py-2 text-right font-medium">Raised</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((row) => (
                    <tr key={row.entryId}>
                      <td className="whitespace-nowrap px-4 py-2 text-neutral-500">
                        {row.enteredAt.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 font-medium text-neutral-900">{row.petName}</td>
                      <td className="px-4 py-2 text-neutral-600">
                        {row.ownerName}
                        <span className="block text-xs text-neutral-400">{row.ownerEmail}</span>
                      </td>
                      <td className="px-4 py-2 text-neutral-500">{row.status}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-neutral-700">{row.voteCount}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-neutral-700">
                        ${(row.totalRaisedCents / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                        No entries yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
