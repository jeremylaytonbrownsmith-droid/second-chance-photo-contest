import Stripe from "stripe";
import type {
  CheckoutSession,
  CreateCheckoutSessionInput,
  PaymentProvider,
  RefundResult,
  SessionPaymentStatus,
  SessionResult,
} from "./provider";
import { PaymentProviderError } from "./provider";

let client: Stripe | null = null;

function stripeClient(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new PaymentProviderError(
      "STRIPE_SECRET_KEY is not set — use a test-mode secret key (sk_test_...)",
    );
  }
  client = new Stripe(key);
  return client;
}

function mapStatus(session: Stripe.Checkout.Session): SessionPaymentStatus {
  if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
    return "paid";
  }
  if (session.status === "expired") return "failed";
  return "unpaid";
}

/** Stripe Checkout in test mode — swap STRIPE_SECRET_KEY for a live key
 * when the client is ready to take real payments through Stripe, or write
 * a BBMS adapter against the same PaymentProvider interface when real
 * Blackbaud credentials exist (see DECISIONS.md). */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "STRIPE" as const;

  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession> {
    const session = await stripeClient().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: input.description },
            unit_amount: input.amountCents,
          },
          quantity: 1,
        },
      ],
      customer_email: input.customerEmail,
      metadata: input.metadata,
      success_url: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: input.cancelUrl,
    });
    if (!session.url) {
      throw new PaymentProviderError("Stripe did not return a checkout URL");
    }
    return { id: session.id, url: session.url };
  }

  async retrieveSession(sessionId: string): Promise<SessionResult> {
    const session = await stripeClient().checkout.sessions.retrieve(sessionId);
    return {
      status: mapStatus(session),
      amountCents: session.amount_total ?? 0,
      processorRef: session.id,
      customerEmail: session.customer_details?.email ?? undefined,
      metadata: session.metadata ?? {},
    };
  }

  async refund(processorRef: string, amountCents?: number): Promise<RefundResult> {
    const session = await stripeClient().checkout.sessions.retrieve(processorRef);
    const paymentIntent = session.payment_intent;
    if (!paymentIntent || typeof paymentIntent !== "string") {
      throw new PaymentProviderError(`No payment_intent on session ${processorRef} to refund`);
    }
    const refund = await stripeClient().refunds.create({
      payment_intent: paymentIntent,
      amount: amountCents,
    });
    return { refundId: refund.id, amountCents: refund.amount };
  }
}
