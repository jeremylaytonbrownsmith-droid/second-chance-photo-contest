import type { PaymentProvider } from "./provider";
import { MockPaymentProvider } from "./mock-provider";
import { StripePaymentProvider } from "./stripe-provider";

export type { PaymentProvider, CheckoutSession, SessionResult } from "./provider";
export { PaymentProviderError } from "./provider";

let cached: PaymentProvider | null = null;

/** Picks the active provider from PAYMENT_PROVIDER (mock | stripe). BBMS
 * isn't wired in here yet — see DECISIONS.md; add a case once a real
 * adapter exists behind the same PaymentProvider interface. */
export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  const configured = (process.env.PAYMENT_PROVIDER ?? "mock").toLowerCase();
  switch (configured) {
    case "stripe":
      cached = new StripePaymentProvider();
      break;
    case "mock":
      cached = new MockPaymentProvider();
      break;
    default:
      throw new Error(
        `Unknown PAYMENT_PROVIDER "${configured}" — expected "mock" or "stripe"`,
      );
  }
  return cached;
}
