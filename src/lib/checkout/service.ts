import type { PaystackApi, PaystackTransaction } from "@/lib/paystack/types";

import {
  generateReference as defaultGenerateReference,
  isValidReference,
} from "./reference";
import { repriceCart, type OrderAmounts, type PricedOrderItem } from "./reprice";
import {
  checkoutMetadataSchema,
  checkoutRequestSchema,
  formatAddress,
  type CheckoutMetadata,
} from "./schemas";

// Server-side checkout logic. Pure apart from the injected Paystack client, so it can be unit
// tested with a fake API. The Server Actions in src/app/checkout/actions.ts are thin wrappers.

export type StartCheckoutResult =
  | { ok: true; authorizationUrl: string; reference: string }
  | {
      ok: false;
      code:
        | "invalid_request"
        | "empty_cart"
        | "too_many_lines"
        | "unknown_product"
        | "invalid_variant"
        | "invalid_quantity"
        | "out_of_stock"
        | "config_error"
        | "network_error"
        | "paystack_error";
      message: string;
      /** Field-level messages for the form, keyed by customer field name. */
      fieldErrors?: Record<string, string>;
    };

export type VerifiedOrder = {
  reference: string;
  items: PricedOrderItem[];
  amounts: OrderAmounts;
  currency: "NGN";
  customerEmail: string;
  customer: CheckoutMetadata["customer"];
  paidAt: string | null;
};

export type VerifyFailureCode =
  | "invalid_reference"
  | "not_found"
  | "payment_abandoned"
  | "payment_failed"
  | "payment_pending"
  | "reference_mismatch"
  | "currency_mismatch"
  | "invalid_metadata"
  | "amount_mismatch"
  | "config_error"
  | "network_error"
  | "paystack_error";

export type ConfirmCheckoutResult =
  | { ok: true; order: VerifiedOrder }
  | { ok: false; code: VerifyFailureCode; message: string };

type StartDeps = {
  paystack: PaystackApi;
  /** NEXT_PUBLIC_SITE_URL: the callback URL is built from it. */
  siteUrl: string | undefined;
  generateReference?: () => string;
};

export async function startCheckout(
  input: unknown,
  deps: StartDeps,
): Promise<StartCheckoutResult> {
  const parsed = checkoutRequestSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === "customer" && typeof issue.path[1] === "string") {
        fieldErrors[issue.path[1]] ??= issue.message;
      }
    }
    return {
      ok: false,
      code: "invalid_request",
      message: "Please check the highlighted fields.",
      fieldErrors,
    };
  }

  const siteUrl = deps.siteUrl?.trim().replace(/\/+$/, "");
  if (!siteUrl || !/^https?:\/\//.test(siteUrl)) {
    return {
      ok: false,
      code: "config_error",
      message:
        "Checkout isn't configured on this deployment (NEXT_PUBLIC_SITE_URL is missing).",
    };
  }

  const { items, customer } = parsed.data;
  // Never trust anything price-like from the client: re-price from the catalogue.
  const priced = repriceCart(items, { enforceStock: true });
  if (!priced.ok)
    return { ok: false, code: priced.error.code, message: priced.error.message };

  const metadata: CheckoutMetadata = {
    app: "kestrel-demo",
    cart: priced.items.map((item) => ({
      p: item.productId,
      v: item.variant,
      q: item.quantity,
    })),
    customer: {
      fullName: customer.fullName,
      phone: customer.phone,
      address: formatAddress(customer),
    },
  };

  const reference = (deps.generateReference ?? defaultGenerateReference)();
  const callbackUrl = `${siteUrl}/checkout/callback`;
  const result = await deps.paystack.initialize({
    email: customer.email,
    amount: priced.amounts.total,
    currency: "NGN",
    reference,
    callback_url: callbackUrl,
    metadata: {
      ...metadata,
      // Where Paystack's hosted page sends a visitor who cancels. Our callback re-verifies
      // with Paystack (the URL itself is never trusted) and shows "Payment not completed".
      cancel_action: `${callbackUrl}?reference=${reference}`,
    },
  });

  if (!result.ok) {
    return {
      ok: false,
      code: result.kind === "network" ? "network_error" : "paystack_error",
      message: result.message,
    };
  }
  if (result.reference !== reference) {
    return {
      ok: false,
      code: "paystack_error",
      message: "Paystack returned a different reference.",
    };
  }
  return { ok: true, authorizationUrl: result.authorizationUrl, reference };
}

function parseMetadata(raw: unknown): CheckoutMetadata | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  const parsed = checkoutMetadataSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Decides whether a verified Paystack transaction is an acceptable payment for `reference`.
 * Accepts ONLY a successful NGN payment whose amount equals the total re-computed on the server
 * from the cart lines in the metadata. Pure, so the same input always gives the same answer.
 */
export function evaluateTransaction(
  reference: string,
  transaction: PaystackTransaction,
): ConfirmCheckoutResult {
  if (transaction.reference !== reference) {
    return {
      ok: false,
      code: "reference_mismatch",
      message: "This payment doesn't match your order reference.",
    };
  }

  switch (transaction.status) {
    case "success":
      break;
    case "abandoned":
      return {
        ok: false,
        code: "payment_abandoned",
        message: "The payment wasn't completed. You haven't been charged.",
      };
    case "failed":
    case "reversed":
      return {
        ok: false,
        code: "payment_failed",
        message: "The payment didn't go through. You haven't been charged.",
      };
    default:
      return {
        ok: false,
        code: "payment_pending",
        message:
          "Paystack hasn't confirmed a payment for this order. If you closed or cancelled the payment page, you haven't been charged.",
      };
  }

  if (transaction.currency !== "NGN") {
    return {
      ok: false,
      code: "currency_mismatch",
      message: "The payment was made in the wrong currency, so we couldn't accept it.",
    };
  }

  const metadata = parseMetadata(transaction.metadata);
  if (!metadata) {
    return {
      ok: false,
      code: "invalid_metadata",
      message: "We couldn't read the order details attached to this payment.",
    };
  }

  // Re-compute from the catalogue. Stock is not re-checked: the customer has already paid.
  const priced = repriceCart(
    metadata.cart.map((line) => ({
      productId: line.p,
      variantId: line.v,
      quantity: line.q,
    })),
    { enforceStock: false },
  );
  if (!priced.ok) {
    return {
      ok: false,
      code: "invalid_metadata",
      message: "The order attached to this payment couldn't be priced.",
    };
  }

  if (
    !Number.isSafeInteger(transaction.amount) ||
    transaction.amount !== priced.amounts.total
  ) {
    return {
      ok: false,
      code: "amount_mismatch",
      message:
        "The amount paid doesn't match the order total, so the payment wasn't accepted.",
    };
  }

  const customerEmail = transaction.customer?.email?.trim().toLowerCase();
  if (!customerEmail) {
    return {
      ok: false,
      code: "invalid_metadata",
      message: "The payment has no customer email.",
    };
  }

  return {
    ok: true,
    order: {
      reference,
      items: priced.items,
      amounts: priced.amounts,
      currency: "NGN",
      customerEmail,
      customer: metadata.customer,
      paidAt: transaction.paid_at ?? null,
    },
  };
}

export async function confirmCheckout(
  reference: unknown,
  deps: { paystack: PaystackApi },
): Promise<ConfirmCheckoutResult> {
  if (!isValidReference(reference)) {
    return {
      ok: false,
      code: "invalid_reference",
      message: "This link doesn't contain a valid payment reference.",
    };
  }
  const result = await deps.paystack.verify(reference);
  if (!result.ok) {
    const code =
      result.kind === "network"
        ? "network_error"
        : result.kind === "not_found"
          ? "not_found"
          : "paystack_error";
    return { ok: false, code, message: result.message };
  }
  return evaluateTransaction(reference, result.transaction);
}
