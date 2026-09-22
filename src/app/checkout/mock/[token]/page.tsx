import { notFound } from "next/navigation";
import { theme } from "@/lib/theme";
import { decodeMockSession } from "@/lib/payments/mock-token";

/** Stand-in "hosted checkout" page for the mock payment provider — see
 * src/lib/payments/mock-provider.ts. No money moves; clicking Pay redirects
 * to the real successUrl with a session_id attached, exactly like Stripe
 * Checkout does, so nothing downstream needs a mock-specific code path. */
export default async function MockCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ success_url?: string; cancel_url?: string }>;
}) {
  const { token } = await params;
  const { success_url: successUrl, cancel_url: cancelUrl } = await searchParams;

  if (!successUrl || !cancelUrl) {
    notFound();
  }

  let session;
  try {
    session = decodeMockSession(decodeURIComponent(token));
  } catch {
    notFound();
  }

  const payUrl = `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id=${encodeURIComponent(token)}`;

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-100 px-6 py-16">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Test payment — no real charge
        </p>
        <h1 className="mb-6 text-center text-lg font-semibold text-neutral-900">{theme.org.name}</h1>

        <div className="mb-6 rounded-lg bg-neutral-50 p-4">
          <p className="text-sm text-neutral-600">{session.description}</p>
          <p className="mt-2 text-2xl font-bold text-neutral-900">${(session.amountCents / 100).toFixed(2)}</p>
        </div>

        <a
          href={payUrl}
          className="block w-full rounded-md bg-brand-primary px-4 py-3 text-center text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-primary-dark hover:shadow-md active:translate-y-0"
        >
          Pay ${(session.amountCents / 100).toFixed(2)} (test)
        </a>
        <a
          href={cancelUrl}
          className="mt-3 block w-full rounded-md border border-neutral-300 px-4 py-3 text-center text-sm font-medium text-neutral-700 transition-colors duration-200 hover:bg-neutral-50"
        >
          Cancel
        </a>
      </div>
    </main>
  );
}
