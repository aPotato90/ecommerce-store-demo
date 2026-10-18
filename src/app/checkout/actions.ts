"use server";

import {
  confirmCheckout,
  startCheckout,
  type ConfirmCheckoutResult,
  type StartCheckoutResult,
} from "@/lib/checkout/service";
import { getPaystackApi, PaystackConfigError } from "@/lib/paystack/server";

// Server Actions are public POST endpoints: every input is validated in the service, and only
// the shaped result objects below are returned to the browser.

function configError(error: unknown) {
  if (error instanceof PaystackConfigError) {
    return { ok: false as const, code: "config_error" as const, message: error.message };
  }
  throw error;
}

/**
 * Starts a Paystack test-mode payment. Receives only product ids, variants, quantities and the
 * customer fields; prices are re-computed from the server-side catalogue.
 */
export async function initializeCheckout(input: unknown): Promise<StartCheckoutResult> {
  try {
    return await startCheckout(input, {
      paystack: getPaystackApi(),
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    });
  } catch (error) {
    return configError(error);
  }
}

/** Verifies a payment with Paystack and returns the order to save, or why it can't be saved. */
export async function verifyCheckout(reference: unknown): Promise<ConfirmCheckoutResult> {
  try {
    return await confirmCheckout(reference, { paystack: getPaystackApi() });
  } catch (error) {
    return configError(error);
  }
}
