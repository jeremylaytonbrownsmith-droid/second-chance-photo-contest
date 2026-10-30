import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/auth";
import { formatRelativeTime } from "@/lib/format-relative-time";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdmin();
  const { error } = await searchParams;

  if (admin.role !== "SUPER_ADMIN") {
    return (
      <main className="flex-1 bg-neutral-100 px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
            Only a super admin can manage admin logins.
          </p>
        </div>
      </main>
    );
  }

  const admins = await prisma.adminUser.findMany({
    where: { voidedAt: null },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="flex-1 bg-neutral-100 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Admin logins</h1>
          <p className="text-sm text-neutral-500">
            Each person gets their own login and 2FA passkey — the activity log always shows who did what.
          </p>
        </div>

        {error && (
          <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <div className="mb-8 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">Add an admin login</h2>
          <form action="/api/admin/users" method="POST" className="space-y-3">
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-neutral-600">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-medium text-neutral-600">
                Starting password (share this with them directly — they can change it themselves after
                signing in, under their email in the top right)
              </label>
              <input
                id="password"
                name="password"
                type="text"
                required
                minLength={10}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-primary-dark"
            >
              Add admin
            </button>
          </form>
        </div>

        <div className="space-y-2">
          {admins.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-900">
                  {a.email} {a.id === admin.id && <span className="font-normal text-neutral-400">(you)</span>}
                </p>
                <p className="text-xs text-neutral-400">
                  {a.role === "SUPER_ADMIN" ? "Super admin" : "Admin"} · added {formatRelativeTime(a.createdAt)}
                </p>
              </div>
              {a.id !== admin.id && (
                <form action={`/api/admin/users/${a.id}/remove`} method="POST">
                  <button
                    type="submit"
                    className="whitespace-nowrap rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors duration-150 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
