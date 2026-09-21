import type {
  CheckoutSession,
  CreateCheckoutSessionInput,
  PaymentProvider,
  RefundResult,
  SessionResult,
} from "./provider";
import { decodeMockSession, encodeMockSession } from "./mock-token";

/**
 * Demo/test provider — no network call, no external account needed.
 * "Paying" happens on an in-app mock checkout page
 * (src/app/checkout/mock/[token]/page.tsx): clicking Pay redirects to the
 * real successUrl with the session token attached, exactly like a real
 * processor would, so the rest of the app never needs a mock-specific
 * code path.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "MOCK" as const;

  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession> {
    const token = encodeMockSession({
      amountCents: input.amountCents,
      description: input.description,
      customerEmail: input.customerEmail,
      metadata: input.metadata,
    });
    return {
      id: token,
      url: `/checkout/mock/${encodeURIComponent(token)}?success_url=${encodeURIComponent(
        input.successUrl,
      )}&cancel_url=${encodeURIComponent(input.cancelUrl)}`,
    };
  }

  async retrieveSession(sessionId: string): Promise<SessionResult> {
    const payload = decodeMockSession(sessionId);
    return {
      status: "paid",
      amountCents: payload.amountCents,
      processorRef: sessionId,
      customerEmail: payload.customerEmail,
      metadata: payload.metadata,
    };
  }

  async refund(processorRef: string, amountCents?: number): Promise<RefundResult> {
    const payload = decodeMockSession(processorRef);
    return {
      refundId: `mock-refund-${processorRef.slice(0, 12)}`,
      amountCents: amountCents ?? payload.amountCents,
    };
  }
}
