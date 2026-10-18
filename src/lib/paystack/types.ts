import { z } from "zod";

// Response shapes for the two Paystack endpoints we use. Unknown fields are ignored.
// Base URL and paths per Paystack's OpenAPI spec (github.com/PaystackHQ/openapi):
//   POST /transaction/initialize, GET /transaction/verify/{reference}

export const initializeResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z
    .object({
      authorization_url: z.url(),
      access_code: z.string(),
      reference: z.string(),
    })
    .optional()
    .nullable(),
});

export const transactionSchema = z.object({
  /** "success", "failed", "abandoned", "ongoing", "pending", "processing", "queued", "reversed" */
  status: z.string(),
  reference: z.string(),
  /** Amount in the currency's minor unit (kobo for NGN). */
  amount: z.number(),
  currency: z.string(),
  /** Whatever we sent at initialization; may come back as an object or a JSON string. */
  metadata: z.unknown().optional(),
  paid_at: z.string().nullable().optional(),
  gateway_response: z.string().nullable().optional(),
  customer: z.object({ email: z.string() }).partial().nullable().optional(),
});

export const verifyResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: transactionSchema.optional().nullable(),
});

export type PaystackTransaction = z.infer<typeof transactionSchema>;

export type InitializeParams = {
  email: string;
  /** Kobo. */
  amount: number;
  currency: "NGN";
  reference: string;
  callback_url: string;
  metadata: Record<string, unknown>;
};

export type PaystackFailure = {
  ok: false;
  /** network: no usable response; not_found: unknown reference; rejected: Paystack said no. */
  kind: "network" | "not_found" | "rejected";
  message: string;
};

export type InitializeOutcome =
  { ok: true; authorizationUrl: string; reference: string } | PaystackFailure;

export type VerifyOutcome =
  { ok: true; transaction: PaystackTransaction } | PaystackFailure;

/** The two calls the checkout needs; swapped for a fake in tests. */
export type PaystackApi = {
  initialize(params: InitializeParams): Promise<InitializeOutcome>;
  verify(reference: string): Promise<VerifyOutcome>;
};
