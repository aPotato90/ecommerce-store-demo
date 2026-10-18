import { describe, expect, it } from "vitest";

import {
  FLAT_SHIPPING,
  FREE_SHIPPING_THRESHOLD,
  percentOfCents,
  priceCart,
} from "./pricing";

describe("priceCart", () => {
  it("returns zeros for an empty cart (no shipping charged)", () => {
    expect(priceCart([])).toEqual({
      lines: [],
      itemCount: 0,
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      amountToFreeShipping: FREE_SHIPPING_THRESHOLD,
      qualifiesForFreeShipping: false,
    });
  });

  it("computes line totals, subtotal and item count", () => {
    const result = priceCart([
      { unitPrice: 1800, quantity: 2 },
      { unitPrice: 2400, quantity: 1 },
    ]);
    expect(result.lines.map((line) => line.lineTotal)).toEqual([3600, 2400]);
    expect(result.subtotal).toBe(6000);
    expect(result.itemCount).toBe(3);
  });

  it("charges flat shipping below the threshold", () => {
    const result = priceCart([{ unitPrice: 4200, quantity: 1 }]);
    expect(result.shipping).toBe(FLAT_SHIPPING);
    expect(result.qualifiesForFreeShipping).toBe(false);
    expect(result.amountToFreeShipping).toBe(3300);
  });

  it("ships free at exactly $75 and above", () => {
    expect(priceCart([{ unitPrice: 7499, quantity: 1 }]).shipping).toBe(600);
    expect(priceCart([{ unitPrice: 7500, quantity: 1 }]).shipping).toBe(0);
    expect(priceCart([{ unitPrice: 2500, quantity: 4 }]).shipping).toBe(0);
    expect(priceCart([{ unitPrice: 7500, quantity: 1 }]).amountToFreeShipping).toBe(0);
  });

  it("applies 7.5% tax on the subtotal and adds everything up", () => {
    const result = priceCart([{ unitPrice: 4200, quantity: 1 }]);
    expect(result.tax).toBe(315);
    expect(result.total).toBe(4200 + 600 + 315);
  });

  it("rounds tax half-up to the nearest cent", () => {
    // 7.5% of $0.10 = 0.75 cents -> 1 cent; of $0.06 = 0.45 cents -> 0 cents.
    expect(priceCart([{ unitPrice: 10, quantity: 1 }]).tax).toBe(1);
    expect(priceCart([{ unitPrice: 6, quantity: 1 }]).tax).toBe(0);
    // 7.5% of $1.00 = 7.5 cents -> 8 cents.
    expect(priceCart([{ unitPrice: 100, quantity: 1 }]).tax).toBe(8);
    expect(percentOfCents(12_345, 750)).toBe(926);
  });

  it("keeps extra fields on each line", () => {
    const result = priceCart([{ unitPrice: 500, quantity: 2, productId: "prd_x" }]);
    expect(result.lines[0]).toEqual({
      unitPrice: 500,
      quantity: 2,
      productId: "prd_x",
      lineTotal: 1000,
    });
  });

  it("does not mutate its input", () => {
    const items = [{ unitPrice: 500, quantity: 2 }];
    priceCart(items);
    expect(items).toEqual([{ unitPrice: 500, quantity: 2 }]);
  });

  it.each([
    [{ unitPrice: -1, quantity: 1 }],
    [{ unitPrice: 10.5, quantity: 1 }],
    [{ unitPrice: Number.NaN, quantity: 1 }],
    [{ unitPrice: 100, quantity: 0 }],
    [{ unitPrice: 100, quantity: 1.5 }],
    [{ unitPrice: 100, quantity: 11 }],
  ])("rejects invalid line %o", (line) => {
    expect(() => priceCart([line])).toThrow(RangeError);
  });
});
