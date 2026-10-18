import { describe, expect, it } from "vitest";

import {
  FLAT_SHIPPING,
  FREE_SHIPPING_THRESHOLD,
  percentOfKobo,
  priceCart,
  VAT_RATE_BASIS_POINTS,
} from "./pricing";

// Amounts are kobo: ₦1 = 100 kobo.
describe("priceCart (NGN, kobo)", () => {
  it("uses the documented constants", () => {
    expect(FREE_SHIPPING_THRESHOLD).toBe(7_500_000); // ₦75,000
    expect(FLAT_SHIPPING).toBe(350_000); // ₦3,500
    expect(VAT_RATE_BASIS_POINTS).toBe(750); // 7.5%
  });

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
      { unitPrice: 500_000, quantity: 2 }, // ₦5,000 × 2
      { unitPrice: 950_000, quantity: 1 }, // ₦9,500
    ]);
    expect(result.lines.map((line) => line.lineTotal)).toEqual([1_000_000, 950_000]);
    expect(result.subtotal).toBe(1_950_000);
    expect(result.itemCount).toBe(3);
  });

  it("charges ₦3,500 shipping below the threshold", () => {
    const result = priceCart([{ unitPrice: 1_850_000, quantity: 1 }]); // ₦18,500
    expect(result.shipping).toBe(350_000);
    expect(result.qualifiesForFreeShipping).toBe(false);
    expect(result.amountToFreeShipping).toBe(5_650_000);
  });

  it("ships free at exactly ₦75,000 and above", () => {
    expect(priceCart([{ unitPrice: 7_499_999, quantity: 1 }]).shipping).toBe(350_000);
    expect(priceCart([{ unitPrice: 7_500_000, quantity: 1 }]).shipping).toBe(0);
    expect(priceCart([{ unitPrice: 2_500_000, quantity: 4 }]).shipping).toBe(0);
    expect(priceCart([{ unitPrice: 7_500_000, quantity: 1 }]).amountToFreeShipping).toBe(
      0,
    );
  });

  it("applies 7.5% VAT on the subtotal only and adds everything up", () => {
    const result = priceCart([{ unitPrice: 1_850_000, quantity: 1 }]);
    expect(result.tax).toBe(138_750); // ₦1,387.50
    expect(result.total).toBe(1_850_000 + 350_000 + 138_750);
  });

  it("rounds VAT half up to the nearest kobo", () => {
    expect(priceCart([{ unitPrice: 10, quantity: 1 }]).tax).toBe(1); // 0.75 → 1
    expect(priceCart([{ unitPrice: 6, quantity: 1 }]).tax).toBe(0); // 0.45 → 0
    expect(priceCart([{ unitPrice: 100, quantity: 1 }]).tax).toBe(8); // 7.5 → 8
    expect(priceCart([{ unitPrice: 20, quantity: 1 }]).tax).toBe(2); // 1.5 → 2
    expect(percentOfKobo(12_345, 750)).toBe(926); // 925.875 → 926
  });

  it("stays exact for the largest possible cart", () => {
    // 6 lines × 10 × ₦120,000 is far below Number.MAX_SAFE_INTEGER.
    const result = priceCart(
      Array.from({ length: 6 }, () => ({ unitPrice: 12_000_000, quantity: 10 })),
    );
    expect(result.subtotal).toBe(720_000_000);
    expect(result.tax).toBe(54_000_000);
    expect(result.total).toBe(774_000_000);
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
