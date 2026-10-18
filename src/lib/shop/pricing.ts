import { MAX_QUANTITY_PER_LINE } from "./schemas";

/** Orders with a subtotal of $75.00 or more ship free. */
export const FREE_SHIPPING_THRESHOLD = 7500;
/** Flat shipping fee for orders under the threshold. */
export const FLAT_SHIPPING = 600;
/** Flat tax rate (7.5%), expressed in basis points to keep the maths in integers. */
export const TAX_RATE_BASIS_POINTS = 750;

export type PriceLineInput = {
  /** Unit price in cents, resolved from the server-side catalogue. */
  unitPrice: number;
  quantity: number;
};

export type PricedLine<T extends PriceLineInput> = T & { lineTotal: number };

export type CartTotals<T extends PriceLineInput> = {
  lines: PricedLine<T>[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  /** Cents still needed to reach free shipping (0 once it applies). */
  amountToFreeShipping: number;
  qualifiesForFreeShipping: boolean;
};

function assertLine(line: PriceLineInput, index: number) {
  if (!Number.isSafeInteger(line.unitPrice) || line.unitPrice < 0) {
    throw new RangeError(
      `Line ${index}: unitPrice must be a non-negative integer of cents`,
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

/** Rounds a basis-point percentage of a cent amount half-up to the nearest cent. */
export function percentOfCents(cents: number, basisPoints: number): number {
  return Math.floor((cents * basisPoints + 5000) / 10000);
}

/**
 * Prices a cart. Pure and deterministic: callers must pass unit prices looked up from the
 * catalogue on the server, never prices supplied by the client.
 *
 * - line total = unit price × quantity
 * - shipping: free when the subtotal is $75 or more, otherwise a flat $6 (none for an empty cart)
 * - tax: flat 7.5% of the subtotal, rounded half-up to the cent
 * - total = subtotal + shipping + tax
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
  const tax = percentOfCents(subtotal, TAX_RATE_BASIS_POINTS);

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
