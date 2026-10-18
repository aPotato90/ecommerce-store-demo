import { describe, expect, it, vi } from "vitest";

import type {
  InitializeParams,
  PaystackApi,
  PaystackTransaction,
  VerifyOutcome,
} from "@/lib/paystack/types";

import { generateReference, REFERENCE_PATTERN } from "./reference";
import { confirmCheckout, evaluateTransaction, startCheckout } from "./service";

const REF = "kc-0123456789abcdef0123456789abcdef";

const customer = {
  email: "  Jamie@Example.com ",
  fullName: "Jamie Demo",
  phone: "0803 000 0000",
  addressLine1: "1 Example Close",
  addressLine2: "",
  city: "Ikeja",
  state: "Lagos",
};

const cart = [
  { productId: "prd_aster_vase", variantId: "sage", quantity: 2 },
  { productId: "prd_pourover_set", variantId: null, quantity: 1 },
];
const EXPECTED_TOTAL = 7_767_500; // ₦69,000 + ₦3,500 shipping + ₦5,175 VAT

function fakePaystack(overrides: Partial<PaystackApi> = {}) {
  const initialize = vi.fn(async (params: InitializeParams) => ({
    ok: true as const,
    authorizationUrl: `https://checkout.paystack.test/${params.reference}`,
    reference: params.reference,
  }));
  const verify = vi.fn(async (): Promise<VerifyOutcome> => ({
    ok: false,
    kind: "not_found",
    message: "nope",
  }));
  return { initialize, verify, ...overrides } as PaystackApi & {
    initialize: typeof initialize;
    verify: typeof verify;
  };
}

const metadata = {
  app: "kestrel-demo",
  cart: [
    { p: "prd_aster_vase", v: "sage", q: 2 },
    { p: "prd_pourover_set", v: null, q: 1 },
  ],
  customer: {
    fullName: "Jamie Demo",
    phone: "08030000000",
    address: "1 Example Close, Ikeja, Lagos",
  },
};

function transaction(overrides: Partial<PaystackTransaction> = {}): PaystackTransaction {
  return {
    status: "success",
    reference: REF,
    amount: EXPECTED_TOTAL,
    currency: "NGN",
    metadata,
    paid_at: "2026-10-18T12:00:00.000Z",
    gateway_response: "Successful",
    customer: { email: "jamie@example.com" },
    ...overrides,
  };
}

describe("startCheckout", () => {
  it("re-prices on the server and initializes Paystack with kobo, NGN and a callback", async () => {
    const paystack = fakePaystack();
    const result = await startCheckout(
      { items: cart, customer },
      { paystack, siteUrl: "https://shop.example.com/", generateReference: () => REF },
    );

    expect(result).toEqual({
      ok: true,
      reference: REF,
      authorizationUrl: `https://checkout.paystack.test/${REF}`,
    });
    expect(paystack.initialize).toHaveBeenCalledWith({
      email: "jamie@example.com",
      amount: EXPECTED_TOTAL,
      currency: "NGN",
      reference: REF,
      callback_url: "https://shop.example.com/checkout/callback",
      metadata,
    });
  });

  it("ignores prices and totals sent by the client", async () => {
    const paystack = fakePaystack();
    await startCheckout(
      {
        items: cart.map((line) => ({ ...line, unitPrice: 1, price: 1 })),
        customer,
        amount: 100,
        total: 100,
      },
      { paystack, siteUrl: "https://shop.example.com", generateReference: () => REF },
    );
    expect(paystack.initialize.mock.calls[0][0].amount).toBe(EXPECTED_TOTAL);
  });

  it("returns field errors for invalid customer details without calling Paystack", async () => {
    const paystack = fakePaystack();
    const result = await startCheckout(
      {
        items: cart,
        customer: { ...customer, email: "nope", phone: "12345", state: "Atlantis" },
      },
      { paystack, siteUrl: "https://shop.example.com" },
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.code).toBe("invalid_request");
    expect(!result.ok && Object.keys(result.fieldErrors ?? {}).sort()).toEqual([
      "email",
      "phone",
      "state",
    ]);
    expect(paystack.initialize).not.toHaveBeenCalled();
  });

  it.each([
    [
      "stock",
      [{ productId: "prd_halden_lamp", variantId: "cream", quantity: 4 }],
      "out_of_stock",
    ],
    [
      "an unknown product",
      [{ productId: "prd_x", variantId: null, quantity: 1 }],
      "unknown_product",
    ],
  ])("enforces %s before calling Paystack", async (_label, items, code) => {
    const paystack = fakePaystack();
    const result = await startCheckout(
      { items, customer },
      { paystack, siteUrl: "https://shop.example.com" },
    );
    expect(!result.ok && result.code).toBe(code);
    expect(paystack.initialize).not.toHaveBeenCalled();
  });

  it("rejects more than 6 lines at the schema level", async () => {
    const paystack = fakePaystack();
    const items = Array.from({ length: 7 }, (_, i) => ({
      productId: `prd_${i}`,
      variantId: null,
      quantity: 1,
    }));
    const result = await startCheckout(
      { items, customer },
      { paystack, siteUrl: "https://a.b" },
    );
    expect(!result.ok && result.code).toBe("invalid_request");
    expect(paystack.initialize).not.toHaveBeenCalled();
  });

  it("refuses to start without a site URL for the callback", async () => {
    const result = await startCheckout(
      { items: cart, customer },
      { paystack: fakePaystack(), siteUrl: undefined },
    );
    expect(!result.ok && result.code).toBe("config_error");
  });

  it("surfaces Paystack rejections, including a duplicate reference", async () => {
    const paystack = fakePaystack({
      initialize: vi.fn(async () => ({
        ok: false as const,
        kind: "rejected" as const,
        message: "Duplicate Transaction Reference",
      })),
    });
    const result = await startCheckout(
      { items: cart, customer },
      { paystack, siteUrl: "https://shop.example.com" },
    );
    expect(result).toEqual({
      ok: false,
      code: "paystack_error",
      message: "Duplicate Transaction Reference",
    });
  });

  it("maps network failures to a retryable error", async () => {
    const paystack = fakePaystack({
      initialize: vi.fn(async () => ({
        ok: false as const,
        kind: "network" as const,
        message: "Couldn't reach Paystack. Please try again.",
      })),
    });
    const result = await startCheckout(
      { items: cart, customer },
      { paystack, siteUrl: "https://shop.example.com" },
    );
    expect(!result.ok && result.code).toBe("network_error");
  });
});

describe("evaluateTransaction (amount verification)", () => {
  it("accepts a successful NGN payment for exactly the re-computed total", () => {
    const result = evaluateTransaction(REF, transaction());
    expect(result).toEqual({
      ok: true,
      order: {
        reference: REF,
        currency: "NGN",
        customerEmail: "jamie@example.com",
        customer: metadata.customer,
        paidAt: "2026-10-18T12:00:00.000Z",
        amounts: {
          subtotal: 6_900_000,
          shipping: 350_000,
          tax: 517_500,
          total: EXPECTED_TOTAL,
        },
        items: [
          {
            productId: "prd_aster_vase",
            name: "Aster Ceramic Vase",
            unitPrice: 1_850_000,
            quantity: 2,
            variant: "sage",
          },
          {
            productId: "prd_pourover_set",
            name: "Slow Morning Pour-Over Set",
            unitPrice: 3_200_000,
            quantity: 1,
            variant: null,
          },
        ],
      },
    });
  });

  it("accepts metadata returned as a JSON string", () => {
    expect(
      evaluateTransaction(REF, transaction({ metadata: JSON.stringify(metadata) })).ok,
    ).toBe(true);
  });

  it.each([
    ["one kobo short", EXPECTED_TOTAL - 1],
    ["one kobo over", EXPECTED_TOTAL + 1],
    ["₦1 instead of the total", 100],
    ["the total in naira instead of kobo", EXPECTED_TOTAL / 100],
    ["a fractional amount", EXPECTED_TOTAL + 0.5],
  ])("rejects a tampered amount: %s", (_label, amount) => {
    const result = evaluateTransaction(REF, transaction({ amount }));
    expect(!result.ok && result.code).toBe("amount_mismatch");
  });

  it("rejects metadata that was tampered with to lower the price", () => {
    // The payer paid for 1 vase but edited the metadata to claim 2: the totals no longer match.
    const result = evaluateTransaction(
      REF,
      transaction({
        amount: 1_850_000 + 350_000 + 138_750,
        metadata: { ...metadata, cart: [{ p: "prd_aster_vase", v: "sage", q: 2 }] },
      }),
    );
    expect(!result.ok && result.code).toBe("amount_mismatch");
  });

  it.each(["USD", "GHS", "ngn", ""])("rejects the wrong currency: %j", (currency) => {
    const result = evaluateTransaction(REF, transaction({ currency }));
    expect(!result.ok && result.code).toBe("currency_mismatch");
  });

  it.each([
    ["abandoned", "payment_abandoned"],
    ["failed", "payment_failed"],
    ["reversed", "payment_failed"],
    ["ongoing", "payment_pending"],
    ["pending", "payment_pending"],
    ["processing", "payment_pending"],
    ["queued", "payment_pending"],
    ["SUCCESS", "payment_pending"],
  ])("rejects a non-success status: %s", (status, code) => {
    const result = evaluateTransaction(REF, transaction({ status }));
    expect(!result.ok && result.code).toBe(code);
  });

  it("rejects a transaction for a different reference", () => {
    const other = "kc-ffffffffffffffffffffffffffffffff";
    const result = evaluateTransaction(REF, transaction({ reference: other }));
    expect(!result.ok && result.code).toBe("reference_mismatch");
  });

  it.each([
    ["missing", undefined],
    ["not JSON", "{oops"],
    ["from another app", { ...metadata, app: "other" }],
    ["with an unknown product", { ...metadata, cart: [{ p: "prd_x", v: null, q: 1 }] }],
    ["with no lines", { ...metadata, cart: [] }],
  ])("rejects metadata that is %s", (_label, badMetadata) => {
    const result = evaluateTransaction(REF, transaction({ metadata: badMetadata }));
    expect(!result.ok && result.code).toBe("invalid_metadata");
  });

  it("is idempotent: verifying the same reference twice gives the same order", () => {
    // The client then saves to users/{uid}/orders/{reference}, so a duplicate visit to the
    // callback maps to the same document and cannot create a second order.
    expect(evaluateTransaction(REF, transaction())).toEqual(
      evaluateTransaction(REF, transaction()),
    );
  });
});

describe("confirmCheckout", () => {
  it("rejects malformed references without calling Paystack", async () => {
    const paystack = fakePaystack();
    for (const reference of [undefined, "", "../secret", "kc-123", `${REF}x`, 42]) {
      const result = await confirmCheckout(reference, { paystack });
      expect(!result.ok && result.code).toBe("invalid_reference");
    }
    expect(paystack.verify).not.toHaveBeenCalled();
  });

  it("verifies through Paystack and evaluates the transaction", async () => {
    const paystack = fakePaystack({
      verify: vi.fn(async () => ({ ok: true as const, transaction: transaction() })),
    });
    const result = await confirmCheckout(REF, { paystack });
    expect(result.ok).toBe(true);
    expect(paystack.verify).toHaveBeenCalledWith(REF);
  });

  it.each([
    ["network", "network_error"],
    ["not_found", "not_found"],
    ["rejected", "paystack_error"],
  ] as const)("maps a %s failure to %s", async (kind, code) => {
    const paystack = fakePaystack({
      verify: vi.fn(async () => ({ ok: false as const, kind, message: "x" })),
    });
    const result = await confirmCheckout(REF, { paystack });
    expect(!result.ok && result.code).toBe(code);
  });
});

describe("generateReference", () => {
  it("produces unique, unguessable references in Paystack's charset", () => {
    const references = new Set(Array.from({ length: 2000 }, generateReference));
    expect(references.size).toBe(2000);
    for (const reference of references) {
      expect(reference).toMatch(REFERENCE_PATTERN);
      expect(reference).toMatch(/^[A-Za-z0-9.=-]+$/);
    }
  });
});
