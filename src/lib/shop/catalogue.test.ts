import { describe, expect, it } from "vitest";

import { products } from "@/data/products";

import {
  getProductBySlug,
  getRelatedProducts,
  maxQuantityFor,
  resolveCartItems,
} from "./catalogue";
import { catalogueSchema } from "./schemas";
import { CATEGORIES } from "./types";

describe("catalogue data", () => {
  it("matches the product schema", () => {
    expect(() => catalogueSchema.parse(products)).not.toThrow();
  });

  it("has 16 products, 4 per category", () => {
    expect(products).toHaveLength(16);
    for (const category of CATEGORIES) {
      expect(products.filter((p) => p.category === category)).toHaveLength(4);
    }
  });

  it("has unique ids, slugs and variant ids", () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
    expect(new Set(products.map((p) => p.slug)).size).toBe(products.length);
    for (const product of products) {
      const ids = product.variants?.options.map((o) => o.id) ?? [];
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("gives every colour variant a swatch", () => {
    for (const product of products) {
      if (product.variants?.kind === "colour") {
        for (const option of product.variants.options)
          expect(option.swatch).toBeDefined();
      }
    }
  });

  it("uses only fictional branding", () => {
    const text = JSON.stringify(products).toLowerCase();
    expect(text).not.toContain("northwind");
  });
});

describe("catalogue helpers", () => {
  it("finds products by slug", () => {
    expect(getProductBySlug("aster-ceramic-vase")?.id).toBe("prd_aster_vase");
    expect(getProductBySlug("does-not-exist")).toBeUndefined();
  });

  it("returns related products without the product itself", () => {
    const vase = getProductBySlug("aster-ceramic-vase")!;
    const related = getRelatedProducts(vase);
    expect(related.length).toBeGreaterThan(0);
    expect(related.length).toBeLessThanOrEqual(4);
    expect(related.some((p) => p.id === vase.id)).toBe(false);
  });

  it("caps max quantity at stock and the per-line limit", () => {
    expect(maxQuantityFor(getProductBySlug("halden-table-lamp")!)).toBe(3);
    expect(maxQuantityFor(getProductBySlug("trail-insulated-bottle")!)).toBe(10);
    expect(maxQuantityFor(getProductBySlug("copper-stovetop-kettle")!)).toBe(0);
  });
});

describe("resolveCartItems", () => {
  it("prices lines from the catalogue", () => {
    const [line] = resolveCartItems([
      { productId: "prd_aster_vase", variantId: "sage", quantity: 2 },
    ]);
    expect(line.unitPrice).toBe(4200);
    expect(line.variant?.label).toBe("Sage");
    expect(line.quantity).toBe(2);
  });

  it("drops unknown products, bad variants and sold-out items", () => {
    const lines = resolveCartItems([
      { productId: "prd_nope", variantId: null, quantity: 1 },
      { productId: "prd_aster_vase", variantId: "neon", quantity: 1 },
      { productId: "prd_aster_vase", variantId: null, quantity: 1 },
      { productId: "prd_pourover_set", variantId: "sage", quantity: 1 },
      { productId: "prd_copper_kettle", variantId: null, quantity: 1 },
    ]);
    expect(lines).toEqual([]);
  });

  it("merges duplicate lines and clamps to stock", () => {
    const lines = resolveCartItems([
      { productId: "prd_halden_lamp", variantId: "cream", quantity: 2 },
      { productId: "prd_halden_lamp", variantId: "cream", quantity: 2 },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(3);
  });
});
