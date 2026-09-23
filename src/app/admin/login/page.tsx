import { theme } from "@/lib/theme";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-100 px-6 py-16">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-center text-lg font-semibold text-neutral-900">{theme.org.name}</h1>
        <p className="mb-6 text-center text-sm text-neutral-500">Admin sign in</p>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <form action="/api/admin/login" method="POST" className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors duration-150 focus:border-brand-primary focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors duration-150 focus:border-brand-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-primary-dark hover:shadow-md active:translate-y-0"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
