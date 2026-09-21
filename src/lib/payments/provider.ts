import type { PaymentProcessorName } from "@prisma/client";

/**
 * Payment processor abstraction (CLAUDE.md rule 6). Blackbaud Merchant
 * Services via the SKY API is the production target; nothing in the app
 * outside this directory should import a specific processor's SDK.
 *
 * Shaped around "create a checkout session, get a hosted redirect URL, a
 * later call confirms the outcome" — that's how Stripe Checkout works, and
 * how Blackbaud's hosted payment links are expected to work too, so a real
 * BBMS adapter should be a new file here, not a redesign of this interface.
 */

export interface CreateCheckoutSessionInput {
  amountCents: number;
  description: string;
  /** Where the processor sends the browser after a completed payment. The
   * provider is responsible for appending whatever token/session
   * identifier it needs onto this URL. */
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  /** Opaque key/value pairs round-tripped back on retrieveSession — used
   * to carry our own transactionId, never processor-specific data. */
  metadata: Record<string, string>;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export type SessionPaymentStatus = "paid" | "unpaid" | "failed";

export interface SessionResult {
  status: SessionPaymentStatus;
  amountCents: number;
  processorRef: string;
  customerEmail?: string;
  metadata: Record<string, string>;
}

export interface RefundResult {
  refundId: string;
  amountCents: number;
}

export interface PaymentProvider {
  readonly name: PaymentProcessorName;
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession>;
  /** Called after redirect (or from a webhook) to confirm what actually
   * happened — never trust the client-side redirect alone for money. */
  retrieveSession(sessionId: string): Promise<SessionResult>;
  refund(processorRef: string, amountCents?: number): Promise<RefundResult>;
}

export class PaymentProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
