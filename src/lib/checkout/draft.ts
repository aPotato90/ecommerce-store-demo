import { z } from "zod";

import type { CustomerInput } from "./schemas";

/**
 * The checkout form is kept in sessionStorage (this tab only) so the visitor's details survive
 * a trip to Paystack and back even when the browser reloads the page instead of restoring it
 * from the back/forward cache. It holds fake demo data, is never sent anywhere, and is cleared
 * once an order is saved. Every storage access is guarded: blocked storage just means no draft.
 */
export const CHECKOUT_DRAFT_KEY = "kestrel-checkout-draft";

const draftSchema = z.object({
  email: z.string().max(254).catch(""),
  fullName: z.string().max(80).catch(""),
  phone: z.string().max(20).catch(""),
  addressLine1: z.string().max(120).catch(""),
  addressLine2: z.string().max(120).catch(""),
  city: z.string().max(60).catch(""),
  state: z.string().max(40).catch(""),
});

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function sessionStore(): StorageLike | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readCheckoutDraft(storage = sessionStore()): CustomerInput | null {
  try {
    const raw = storage?.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as CustomerInput) : null;
  } catch {
    return null;
  }
}

export function writeCheckoutDraft(
  values: Partial<CustomerInput>,
  storage = sessionStore(),
) {
  try {
    storage?.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(values));
  } catch {
    // Storage blocked or full: the form still works, it just won't be restored.
  }
}

export function clearCheckoutDraft(storage = sessionStore()) {
  try {
    storage?.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}
