import { describe, expect, it, vi } from "vitest";

import {
  createPaystackApi,
  getPaystackBaseUrl,
  getPaystackSecretKey,
  PaystackConfigError,
} from "./server";

// No test here talks to the real Paystack API: `fetch` is always a mock.

const SECRET = "sk_test_this_is_a_fake_key_for_tests";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const initParams = {
  email: "jamie@example.com",
  amount: 7_767_500,
  currency: "NGN" as const,
  reference: "kc-0123456789abcdef0123456789abcdef",
  callback_url: "https://shop.example.com/checkout/callback",
  metadata: { app: "kestrel-demo", cart: [{ p: "prd_aster_vase", v: "sage", q: 1 }] },
};

describe("getPaystackSecretKey", () => {
  it("accepts an sk_test_ key", () => {
    expect(getPaystackSecretKey({ PAYSTACK_SECRET_KEY: SECRET })).toBe(SECRET);
  });

  it.each([
    ["missing", undefined, /missing/],
    ["empty", "  ", /missing/],
    ["a live key", "sk_live_abc123", /Test mode only/],
    ["a public key", "pk_test_abc123", /Test mode only/],
    ["garbage", "hunter2", /Test mode only/],
  ])("refuses a %s key without echoing it", (_label, key, message) => {
    let error: unknown;
    try {
      getPaystackSecretKey({ PAYSTACK_SECRET_KEY: key });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(PaystackConfigError);
    expect((error as Error).message).toMatch(message);
    if (key?.trim()) expect((error as Error).message).not.toContain(key);
  });
});

describe("getPaystackBaseUrl", () => {
  it("defaults to the real API", () => {
    expect(getPaystackBaseUrl({})).toBe("https://api.paystack.co");
  });

  it("allows only a local mock server as an override", () => {
    expect(getPaystackBaseUrl({ PAYSTACK_API_BASE_URL: "http://127.0.0.1:4010" })).toBe(
      "http://127.0.0.1:4010",
    );
    expect(() =>
      getPaystackBaseUrl({ PAYSTACK_API_BASE_URL: "https://evil.example.com" }),
    ).toThrow(PaystackConfigError);
    expect(() =>
      getPaystackBaseUrl({ PAYSTACK_API_BASE_URL: "http://localhost.evil.example.com" }),
    ).toThrow(PaystackConfigError);
  });
});

describe("createPaystackApi.initialize", () => {
  it("POSTs to /transaction/initialize with the bearer key and stringified metadata", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        status: true,
        message: "Authorization URL created",
        data: {
          authorization_url: "https://checkout.paystack.com/abc123",
          access_code: "abc123",
          reference: initParams.reference,
        },
      }),
    );
    const api = createPaystackApi({ secretKey: SECRET, fetchImpl });
    const result = await api.initialize(initParams);

    expect(result).toEqual({
      ok: true,
      authorizationUrl: "https://checkout.paystack.com/abc123",
      reference: initParams.reference,
    });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.paystack.co/transaction/initialize");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${SECRET}`,
    );
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      amount: 7_767_500,
      currency: "NGN",
      email: "jamie@example.com",
    });
    expect(typeof body.metadata).toBe("string");
    expect(JSON.parse(body.metadata)).toEqual(initParams.metadata);
  });

  it("reports Paystack's rejection message", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(400, { status: false, message: "Duplicate Transaction Reference" }),
    );
    const api = createPaystackApi({ secretKey: SECRET, fetchImpl });
    expect(await api.initialize(initParams)).toEqual({
      ok: false,
      kind: "rejected",
      message: "Duplicate Transaction Reference",
    });
  });

  it("treats thrown fetches and garbage bodies as network errors without leaking the key", async () => {
    const thrower = vi.fn(async () => {
      throw new TypeError(`fetch failed for Bearer ${SECRET}`);
    });
    const garbage = vi.fn(async () => new Response("<html>502</html>", { status: 502 }));
    for (const fetchImpl of [thrower, garbage]) {
      const result = await createPaystackApi({ secretKey: SECRET, fetchImpl }).initialize(
        initParams,
      );
      expect(result.ok).toBe(false);
      expect(!result.ok && result.kind).toBe("network");
      expect(JSON.stringify(result)).not.toContain(SECRET);
    }
  });
});

describe("createPaystackApi.verify", () => {
  const transaction = {
    id: 1,
    status: "success",
    reference: initParams.reference,
    amount: 7_767_500,
    currency: "NGN",
    metadata: { app: "kestrel-demo" },
    paid_at: "2026-10-18T12:00:00.000Z",
    gateway_response: "Successful",
    customer: { email: "jamie@example.com", id: 9 },
    authorization: { last4: "4081" },
  };

  it("GETs /transaction/verify/{reference} and returns the transaction", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        status: true,
        message: "Verification successful",
        data: transaction,
      }),
    );
    const api = createPaystackApi({
      secretKey: SECRET,
      baseUrl: "http://127.0.0.1:4010",
      fetchImpl,
    });
    const result = await api.verify(initParams.reference);
    expect(result.ok && result.transaction).toMatchObject({
      status: "success",
      amount: 7_767_500,
      currency: "NGN",
    });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`http://127.0.0.1:4010/transaction/verify/${initParams.reference}`);
    expect(init.method).toBe("GET");
  });

  it("maps an unknown reference to not_found", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(400, { status: false, message: "Transaction reference not found" }),
    );
    const result = await createPaystackApi({ secretKey: SECRET, fetchImpl }).verify(
      "kc-x",
    );
    expect(!result.ok && result.kind).toBe("not_found");
  });

  it("URL-encodes the reference", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(404, {}));
    await createPaystackApi({ secretKey: SECRET, fetchImpl }).verify("a/../b");
    const [url] = fetchImpl.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://api.paystack.co/transaction/verify/a%2F..%2Fb");
  });
});
