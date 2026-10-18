import { MAX_QUANTITY_PER_LINE } from "./schemas";

// All amounts are integers in kobo (NGN minor unit, ₦1 = 100 kobo).

/** Orders with a subtotal of ₦75,000 or more ship free. */
export const FREE_SHIPPING_THRESHOLD = 7_500_000;
/** Flat shipping fee (₦3,500) for orders under the threshold. */
export const FLAT_SHIPPING = 350_000;
/** VAT rate (7.5%), in basis points so the maths stays in integers. */
export const VAT_RATE_BASIS_POINTS = 750;

export type PriceLineInput = {
  /** Unit price in kobo, resolved from the server-side catalogue. */
  unitPrice: number;
  quantity: number;
};

export type PricedLine<T extends PriceLineInput> = T & { lineTotal: number };

export type CartTotals<T extends PriceLineInput> = {
  lines: PricedLine<T>[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  /** VAT in kobo. Named `tax` to match the stored order amounts. */
  tax: number;
  total: number;
  /** Kobo still needed to reach free shipping (0 once it applies). */
  amountToFreeShipping: number;
  qualifiesForFreeShipping: boolean;
};

function assertLine(line: PriceLineInput, index: number) {
  if (!Number.isSafeInteger(line.unitPrice) || line.unitPrice < 0) {
    throw new RangeError(
      `Line ${index}: unitPrice must be a non-negative integer of kobo`,
    );
  }
  if (
    !Number.isSafeInteger(line.quantity) ||
    line.quantity < 1 ||
    line.quantity > MAX_QUANTITY_PER_LINE
  ) {
    throw new RangeError(
      `Line ${index}: quantity must be an integer from 1 to ${MAX_QUANTITY_PER_LINE}`,
    );
  }
}

/**
 * A basis-point share of an amount in kobo, using integer maths only.
 *
 * Rounding rule: round half up to the nearest kobo, i.e. floor((amount × bp + 5000) / 10000).
 * Example: 7.5% of ₦0.10 (10 kobo) is 0.75 kobo → 1 kobo; 7.5% of 6 kobo is 0.45 → 0 kobo.
 */
export function percentOfKobo(kobo: number, basisPoints: number): number {
  return Math.floor((kobo * basisPoints + 5000) / 10000);
}

/**
 * Prices a cart. Pure and deterministic: callers must pass unit prices looked up from the
 * catalogue on the server, never prices supplied by the client.
 *
 * - line total = unit price × quantity
 * - shipping: free when the subtotal is ₦75,000 or more, otherwise a flat ₦3,500
 *   (nothing for an empty cart)
 * - VAT: 7.5% of the subtotal (not of shipping), rounded half up to the kobo
 * - total = subtotal + shipping + VAT
 */
export function priceCart<T extends PriceLineInput>(items: readonly T[]): CartTotals<T> {
  items.forEach(assertLine);

  const lines = items.map((item) => ({
    ...item,
    lineTotal: item.unitPrice * item.quantity,
  }));
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shipping = lines.length === 0 || qualifiesForFreeShipping ? 0 : FLAT_SHIPPING;
  const tax = percentOfKobo(subtotal, VAT_RATE_BASIS_POINTS);

  return {
    lines,
    itemCount,
    subtotal,
    shipping,
    tax,
    total: subtotal + shipping + tax,
    amountToFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
    qualifiesForFreeShipping,
  };
}
