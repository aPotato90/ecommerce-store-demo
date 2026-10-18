import "server-only";

import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Server-side Stripe client for the (upcoming) checkout. TEST MODE ONLY: live keys are
 * refused so this demo can never process a real payment. Never log the key.
 */
export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  if (!key.startsWith("sk_test_")) {
    throw new Error(
      "Refusing to start: this demo store only accepts Stripe test-mode keys.",
    );
  }
  client = new Stripe(key, { appInfo: { name: "Kestrel & Co. demo store" } });
  return client;
}
