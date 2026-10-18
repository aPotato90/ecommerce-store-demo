import { describe, expect, it } from "vitest";

import { repriceCart } from "./reprice";

const vase = { productId: "prd_aster_vase", variantId: "sage", quantity: 2 }; // ₦18,500
const pourover = { productId: "prd_pourover_set", variantId: null, quantity: 1 }; // ₦32,000

describe("repriceCart", () => {
  it("prices lines from the catalogue in kobo", () => {
    const result = repriceCart([vase, pourover], { enforceStock: true });
    expect(result).toEqual({
      ok: true,
      items: [
        {
          productId: "prd_aster_vase",
          name: "Aster Ceramic Vase",
          unitPrice: 1_850_000,
          quantity: 2,
          variant: "sage",
        },
        {
          productId: "prd_pourover_set",
          name: "Slow Morning Pour-Over Set",
          unitPrice: 3_200_000,
          quantity: 1,
          variant: null,
        },
      ],
      // ₦69,000 subtotal: under ₦75,000 so ₦3,500 shipping; VAT 7.5% = ₦5,175.
      amounts: { subtotal: 6_900_000, shipping: 350_000, tax: 517_500, total: 7_767_500 },
    });
  });

  it("ignores any price-like fields a client might add", () => {
    const tampered = { ...vase, unitPrice: 1, price: 1, total: 1 } as typeof vase;
    const result = repriceCart([tampered], { enforceStock: true });
    expect(result.ok && result.items[0].unitPrice).toBe(1_850_000);
  });

  it("merges duplicate lines before checking limits", () => {
    const result = repriceCart(
      [
        { ...vase, quantity: 1 },
        { ...vase, quantity: 2 },
      ],
      { enforceStock: true },
    );
    expect(result.ok && result.items).toHaveLength(1);
    expect(result.ok && result.items[0].quantity).toBe(3);
  });

  it.each([
    ["an empty cart", [], "empty_cart"],
    [
      "an unknown product",
      [{ productId: "prd_free_money", variantId: null, quantity: 1 }],
      "unknown_product",
    ],
    ["a missing variant", [{ ...vase, variantId: null }], "invalid_variant"],
    ["a made-up variant", [{ ...vase, variantId: "gold" }], "invalid_variant"],
    [
      "a variant on a product without variants",
      [{ ...pourover, variantId: "x" }],
      "invalid_variant",
    ],
    ["a zero quantity", [{ ...vase, quantity: 0 }], "invalid_quantity"],
    ["a fractional quantity", [{ ...vase, quantity: 1.5 }], "invalid_quantity"],
    ["more than 10 of one item", [{ ...vase, quantity: 11 }], "invalid_quantity"],
  ])("rejects %s", (_label, lines, code) => {
    const result = repriceCart(lines, { enforceStock: true });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe(code);
  });

  it("enforces stock at checkout but not when re-pricing a completed payment", () => {
    const lamps = [{ productId: "prd_halden_lamp", variantId: "cream", quantity: 4 }]; // stock 3
    const atCheckout = repriceCart(lamps, { enforceStock: true });
    expect(!atCheckout.ok && atCheckout.error.code).toBe("out_of_stock");
    expect(!atCheckout.ok && atCheckout.error.message).toMatch(
      /Only 3 of Halden Table Lamp/,
    );

    const soldOut = repriceCart(
      [{ productId: "prd_copper_kettle", variantId: null, quantity: 1 }],
      { enforceStock: true },
    );
    expect(!soldOut.ok && soldOut.error.message).toMatch(/sold out/);

    expect(repriceCart(lamps, { enforceStock: false }).ok).toBe(true);
  });

  it("caps an order at 6 different products", () => {
    const seven = [
      "prd_aster_vase:sand",
      "prd_aster_vase:sage",
      "prd_aster_vase:charcoal",
      "prd_linen_throw:oat",
      "prd_linen_throw:clay",
      "prd_linen_throw:slate",
      "prd_pourover_set:",
    ].map((key) => {
      const [productId, variantId] = key.split(":");
      return { productId, variantId: variantId || null, quantity: 1 };
    });
    expect(repriceCart(seven.slice(0, 6), { enforceStock: true }).ok).toBe(true);
    const result = repriceCart(seven, { enforceStock: true });
    expect(!result.ok && result.error.code).toBe("too_many_lines");
  });
});
