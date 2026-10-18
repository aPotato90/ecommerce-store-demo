import { products as catalogue } from "@/data/products";
import { cartLineKey, maxQuantityFor } from "@/lib/shop/catalogue";
import { priceCart } from "@/lib/shop/pricing";
import { MAX_CART_LINES, MAX_QUANTITY_PER_LINE } from "@/lib/shop/schemas";
import type { Product } from "@/lib/shop/types";

/** A cart line as sent by the browser or stored in Paystack metadata: ids and a quantity. */
export type RequestedLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
};

/** A line priced from the server-side catalogue. Matches the stored order item shape. */
export type PricedOrderItem = {
  productId: string;
  name: string;
  /** Unit price in kobo from the catalogue, never from the client. */
  unitPrice: number;
  quantity: number;
  /** Variant id (e.g. "sage") or null for products without variants. */
  variant: string | null;
};

export type OrderAmounts = {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
};

export type RepriceError =
  | { code: "empty_cart"; message: string }
  | { code: "too_many_lines"; message: string }
  | { code: "unknown_product"; message: string; productId: string }
  | { code: "invalid_variant"; message: string; productId: string }
  | { code: "invalid_quantity"; message: string; productId: string }
  | { code: "out_of_stock"; message: string; productId: string };

export type RepriceResult =
  | { ok: true; items: PricedOrderItem[]; amounts: OrderAmounts }
  | { ok: false; error: RepriceError };

type RepriceOptions = {
  /**
   * Check quantities against current stock. On at checkout; off when re-pricing a payment
   * that has already been made (stock may have changed since, but the price must not).
   */
  enforceStock: boolean;
  products?: readonly Product[];
};

/**
 * Re-prices a cart from the server-side catalogue. Unlike the forgiving client cart, this
 * rejects anything it can't price exactly: unknown products, bad variants, impossible
 * quantities or (optionally) quantities above stock. Duplicate lines are merged first.
 */
export function repriceCart(
  requested: readonly RequestedLine[],
  { enforceStock, products = catalogue }: RepriceOptions,
): RepriceResult {
  if (requested.length === 0) {
    return { ok: false, error: { code: "empty_cart", message: "Your cart is empty." } };
  }

  const byId = new Map(products.map((product) => [product.id, product]));
  const merged = new Map<
    string,
    { product: Product; variantId: string | null; quantity: number }
  >();

  for (const line of requested) {
    const product = byId.get(line.productId);
    if (!product) {
      return {
        ok: false,
        error: {
          code: "unknown_product",
          productId: line.productId,
          message: "One of the items in your cart is no longer available.",
        },
      };
    }

    const variants = product.variants?.options ?? [];
    const variantOk =
      variants.length === 0
        ? line.variantId === null
        : variants.some((option) => option.id === line.variantId);
    if (!variantOk) {
      return {
        ok: false,
        error: {
          code: "invalid_variant",
          productId: product.id,
          message: `Please choose a valid option for ${product.name}.`,
        },
      };
    }

    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) {
      return {
        ok: false,
        error: {
          code: "invalid_quantity",
          productId: product.id,
          message: `The quantity for ${product.name} isn't valid.`,
        },
      };
    }

    const key = cartLineKey(product.id, line.variantId);
    const existing = merged.get(key);
    merged.set(key, {
      product,
      variantId: line.variantId,
      quantity: (existing?.quantity ?? 0) + line.quantity,
    });
  }

  if (merged.size > MAX_CART_LINES) {
    return {
      ok: false,
      error: {
        code: "too_many_lines",
        message: `An order can contain up to ${MAX_CART_LINES} different items.`,
      },
    };
  }

  const items: PricedOrderItem[] = [];
  for (const { product, variantId, quantity } of merged.values()) {
    if (quantity > MAX_QUANTITY_PER_LINE) {
      return {
        ok: false,
        error: {
          code: "invalid_quantity",
          productId: product.id,
          message: `You can order up to ${MAX_QUANTITY_PER_LINE} of ${product.name}.`,
        },
      };
    }
    if (enforceStock && quantity > maxQuantityFor(product)) {
      const available = maxQuantityFor(product);
      return {
        ok: false,
        error: {
          code: "out_of_stock",
          productId: product.id,
          message:
            available === 0
              ? `${product.name} is sold out. Remove it from your cart to continue.`
              : `Only ${available} of ${product.name} available. Reduce the quantity to continue.`,
        },
      };
    }
    items.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity,
      variant: variantId,
    });
  }

  const totals = priceCart(items);
  return {
    ok: true,
    items,
    amounts: {
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      tax: totals.tax,
      total: totals.total,
    },
  };
}
