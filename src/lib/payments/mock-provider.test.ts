import { beforeAll, describe, expect, it } from "vitest";
import { MockPaymentProvider } from "./mock-provider";
import { PaymentProviderError } from "./provider";

beforeAll(() => {
  process.env.MOCK_PAYMENT_SECRET = "test-secret-do-not-use-in-prod";
});

describe("MockPaymentProvider", () => {
  it("round-trips amount, email, and metadata through the session token", async () => {
    const provider = new MockPaymentProvider();
    const session = await provider.createCheckoutSession({
      amountCents: 2_500,
      description: "25 votes for Biscuit",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      customerEmail: "voter@example.com",
      metadata: { transactionId: "txn_123" },
    });

    expect(session.url).toContain("/checkout/mock/");

    const result = await provider.retrieveSession(session.id);
    expect(result).toEqual({
      status: "paid",
      amountCents: 2_500,
      processorRef: session.id,
      customerEmail: "voter@example.com",
      metadata: { transactionId: "txn_123" },
    });
  });

  it("rejects a tampered token", async () => {
    const provider = new MockPaymentProvider();
    const session = await provider.createCheckoutSession({
      amountCents: 1_000,
      description: "10 votes",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      metadata: {},
    });

    const [payload] = session.id.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ amountCents: 999_999_00, description: "hacked", metadata: {} }),
      "utf8",
    ).toString("base64url");
    const forged = `${tamperedPayload}.${session.id.split(".")[1]}`;
    void payload;

    await expect(provider.retrieveSession(forged)).rejects.toThrow(
      "Invalid mock payment token signature",
    );
  });

  it("refund echoes the original amount when none is specified", async () => {
    const provider = new MockPaymentProvider();
    const session = await provider.createCheckoutSession({
      amountCents: 5_000,
      description: "50 votes",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      metadata: {},
    });
    const refund = await provider.refund(session.id);
    expect(refund.amountCents).toBe(5_000);
  });
});

describe("PaymentProviderError", () => {
  it("is a real Error subclass with the right name", () => {
    const err = new PaymentProviderError("boom");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("PaymentProviderError");
  });
});
