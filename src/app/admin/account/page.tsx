import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const admin = await requireAdmin();
  const { error, success } = await searchParams;

  return (
    <main className="flex-1 bg-neutral-100 px-6 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Your account</h1>
          <p className="text-sm text-neutral-500">{admin.email}</p>
        </div>

        {success && (
          <p className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Password updated.
          </p>
        )}
        {error && (
          <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">Change your password</h2>
          <form action="/api/admin/account/change-password" method="POST" className="space-y-3">
            <div>
              <label htmlFor="currentPassword" className="mb-1 block text-xs font-medium text-neutral-600">
                Current password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="mb-1 block text-xs font-medium text-neutral-600">
                New password (at least 10 characters)
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-primary-dark"
            >
              Update password
            </button>
          </form>
        </div>

        <p className="mt-4 text-xs text-neutral-400">
          Your passkey (2FA) is separate from your password and isn&apos;t changed here. Signing in still requires
          both.
        </p>
      </div>
    </main>
  );
}
