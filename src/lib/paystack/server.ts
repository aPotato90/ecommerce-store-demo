import "server-only";

import {
  initializeResponseSchema,
  verifyResponseSchema,
  type InitializeOutcome,
  type InitializeParams,
  type PaystackApi,
  type VerifyOutcome,
} from "./types";

const DEFAULT_BASE_URL = "https://api.paystack.co";
/** Only local mock servers (used by the browser tests) may replace the real API host. */
const LOCAL_BASE_URL = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/;

export class PaystackConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaystackConfigError";
  }
}

type Env = Record<string, string | undefined>;

/**
 * Reads the secret key. TEST MODE ONLY: anything that isn't an sk_test_ key is refused, so
 * this demo can never charge a real card. The key itself never appears in errors or logs.
 */
export function getPaystackSecretKey(env: Env = process.env): string {
  const key = env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) {
    throw new PaystackConfigError(
      "Payments aren't configured on this deployment (PAYSTACK_SECRET_KEY is missing).",
    );
  }
  if (!key.startsWith("sk_test_")) {
    throw new PaystackConfigError(
      "Test mode only: this demo store refuses to run with a Paystack key that isn't an sk_test_ key.",
    );
  }
  return key;
}

export function getPaystackBaseUrl(env: Env = process.env): string {
  const override = env.PAYSTACK_API_BASE_URL?.trim();
  if (!override) return DEFAULT_BASE_URL;
  if (!LOCAL_BASE_URL.test(override)) {
    throw new PaystackConfigError(
      "PAYSTACK_API_BASE_URL may only point at a local mock server (http://127.0.0.1 or http://localhost).",
    );
  }
  return override;
}

/** Keeps Paystack's own error text, trimmed, and never anything from our request. */
function safeMessage(message: unknown, fallback: string): string {
  return typeof message === "string" && message.trim()
    ? message.trim().slice(0, 200)
    : fallback;
}

type ClientOptions = {
  secretKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export function createPaystackApi({
  secretKey,
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = fetch,
  timeoutMs = 15_000,
}: ClientOptions): PaystackApi {
  async function call(
    path: string,
    init: RequestInit,
  ): Promise<{ status: number; body: unknown } | null> {
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body: unknown = await response.json().catch(() => null);
      return { status: response.status, body };
    } catch {
      return null;
    }
  }

  return {
    async initialize(params: InitializeParams): Promise<InitializeOutcome> {
      const result = await call("/transaction/initialize", {
        method: "POST",
        // Paystack documents metadata as a stringified JSON object.
        body: JSON.stringify({ ...params, metadata: JSON.stringify(params.metadata) }),
      });
      if (!result) {
        return {
          ok: false,
          kind: "network",
          message: "Couldn't reach Paystack. Please try again.",
        };
      }
      const parsed = initializeResponseSchema.safeParse(result.body);
      if (!parsed.success) {
        return {
          ok: false,
          kind: "network",
          message: "Paystack sent an unexpected response.",
        };
      }
      if (!parsed.data.status || !parsed.data.data) {
        return {
          ok: false,
          kind: "rejected",
          message: safeMessage(
            parsed.data.message,
            "Paystack declined to start the payment.",
          ),
        };
      }
      return {
        ok: true,
        authorizationUrl: parsed.data.data.authorization_url,
        reference: parsed.data.data.reference,
      };
    },

    async verify(reference: string): Promise<VerifyOutcome> {
      const result = await call(`/transaction/verify/${encodeURIComponent(reference)}`, {
        method: "GET",
      });
      if (!result) {
        return {
          ok: false,
          kind: "network",
          message: "Couldn't reach Paystack. Please try again.",
        };
      }
      const parsed = verifyResponseSchema.safeParse(result.body);
      if (
        result.status === 404 ||
        (parsed.success && !parsed.data.status && result.status === 400)
      ) {
        return {
          ok: false,
          kind: "not_found",
          message: "Paystack has no transaction with this reference.",
        };
      }
      if (!parsed.success) {
        return {
          ok: false,
          kind: "network",
          message: "Paystack sent an unexpected response.",
        };
      }
      if (!parsed.data.status || !parsed.data.data) {
        return {
          ok: false,
          kind: "rejected",
          message: safeMessage(
            parsed.data.message,
            "Paystack couldn't verify this payment.",
          ),
        };
      }
      return { ok: true, transaction: parsed.data.data };
    },
  };
}

/** The Paystack client for this deployment, configured from the server environment. */
export function getPaystackApi(): PaystackApi {
  return createPaystackApi({
    secretKey: getPaystackSecretKey(),
    baseUrl: getPaystackBaseUrl(),
  });
}
