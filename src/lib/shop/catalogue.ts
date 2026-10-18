import { products } from "@/data/products";

import type { CartItem } from "./schemas";
import { MAX_QUANTITY_PER_LINE } from "./schemas";
import type { Category, Product, VariantOption } from "./types";

export function getAllProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((product) => product.featured);
}

export function getProductsByCategory(category: Category): Product[] {
  return products.filter((product) => product.category === category);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const sameCategory = products.filter(
    (p) => p.id !== product.id && p.category === product.category,
  );
  const sharedTags = products.filter(
    (p) =>
      p.id !== product.id &&
      p.category !== product.category &&
      p.tags.some((tag) => product.tags.includes(tag)),
  );
  return [...sameCategory, ...sharedTags].slice(0, limit);
}

export function getVariant(
  product: Product,
  variantId: string | null,
): VariantOption | undefined {
  if (!variantId) return undefined;
  return product.variants?.options.find((option) => option.id === variantId);
}

/** The most a shopper may hold of one product line: stock-limited and capped per line. */
export function maxQuantityFor(product: Product): number {
  return Math.min(product.stock, MAX_QUANTITY_PER_LINE);
}

export type ResolvedCartLine = {
  key: string;
  product: Product;
  variant: VariantOption | undefined;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
};

export function cartLineKey(productId: string, variantId: string | null): string {
  return `${productId}::${variantId ?? ""}`;
}

/**
 * Resolves stored cart items against a catalogue. Unknown products, unknown or missing
 * variants and sold-out products are dropped; quantities are clamped to stock. Prices
 * always come from the catalogue.
 */
export function resolveCartItems(
  items: readonly CartItem[],
  catalogue: readonly Product[] = products,
): ResolvedCartLine[] {
  const byId = new Map(catalogue.map((product) => [product.id, product]));
  const lines = new Map<string, ResolvedCartLine>();

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) continue;

    const hasVariants = Boolean(product.variants);
    const variant = hasVariants
      ? product.variants?.options.find((option) => option.id === item.variantId)
      : undefined;
    if (hasVariants && !variant) continue;
    if (!hasVariants && item.variantId !== null) continue;

    const maxQuantity = maxQuantityFor(product);
    if (maxQuantity < 1) continue;

    const key = cartLineKey(product.id, variant?.id ?? null);
    const existing = lines.get(key);
    const quantity = Math.min(maxQuantity, (existing?.quantity ?? 0) + item.quantity);
    lines.set(key, {
      key,
      product,
      variant,
      unitPrice: product.price,
      quantity,
      maxQuantity,
    });
  }

  return [...lines.values()];
}
