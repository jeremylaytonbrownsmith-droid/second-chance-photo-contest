import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/auth";
import { formatRelativeTime } from "@/lib/format-relative-time";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Signed in",
  LOGIN_FAILED: "Failed sign-in attempt (wrong password)",
  LOGIN_LOCKED: "Account locked (too many failed attempts)",
  LOGIN_BLOCKED_LOCKED: "Blocked sign-in attempt (account locked)",
  LOGIN_FAILED_UNKNOWN_EMAIL: "Failed sign-in attempt (unknown email)",
  PASSWORD_VERIFIED: "Password verified — passkey step next",
  PASSKEY_REGISTERED: "Registered a new passkey",
  PASSKEY_REGISTER_FAILED: "Failed to register a passkey",
  PASSKEY_LOGIN_FAILED: "Failed passkey verification",
  LOGIN_SUCCESS_MFA_BYPASSED: "Signed in — passkey step bypassed (ADMIN_DISABLE_PASSKEY_MFA)",
  ENTRY_APPROVED: "Approved an entry",
  ENTRY_REJECTED: "Rejected an entry",
  REPORT_EXPORTED: "Downloaded the entries CSV report",
};

const ALERT_ACTIONS = new Set([
  "LOGIN_FAILED",
  "LOGIN_LOCKED",
  "LOGIN_BLOCKED_LOCKED",
  "LOGIN_FAILED_UNKNOWN_EMAIL",
  "PASSKEY_REGISTER_FAILED",
  "PASSKEY_LOGIN_FAILED",
  "LOGIN_SUCCESS_MFA_BYPASSED",
]);

export default async function AdminActivityPage() {
  const admin = await requireAdmin();

  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="flex-1 bg-neutral-100 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-neutral-900">Admin activity</h1>
            <p className="truncate text-sm text-neutral-500">Signed in as {admin.email} · last 100 events</p>
          </div>
          <Link
            href="/admin/moderation"
            className="shrink-0 whitespace-nowrap rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors duration-150 hover:bg-white"
          >
            Back to moderation
          </Link>
        </div>

        {logs.length === 0 ? (
          <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
            No activity logged yet.
          </p>
        ) : (
          <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-neutral-800">
                    <span className={`font-medium ${ALERT_ACTIONS.has(log.action) ? "text-red-700" : "text-neutral-900"}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>{" "}
                    <span className="text-neutral-500">— {log.adminEmail}</span>
                  </p>
                  {log.detail && <p className="mt-0.5 truncate text-xs text-neutral-500">{log.detail}</p>}
                </div>
                <p className="shrink-0 whitespace-nowrap text-xs text-neutral-400">
                  {formatRelativeTime(log.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
