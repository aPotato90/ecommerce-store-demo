import { describe, expect, it } from "vitest";

import { products } from "@/data/products";

import {
  DEFAULT_FILTERS,
  filterProducts,
  parseShopParams,
  toShopSearchParams,
} from "./filters";

const parse = (query: string) => parseShopParams(new URLSearchParams(query));

describe("parseShopParams", () => {
  it("returns defaults for an empty query", () => {
    expect(parse("")).toEqual(DEFAULT_FILTERS);
  });

  it("parses valid values", () => {
    expect(parse("q=mug&category=kitchen&min=10&max=60&sort=price-asc&page=2")).toEqual({
      q: "mug",
      category: "kitchen",
      minPrice: 10,
      maxPrice: 60,
      sort: "price-asc",
      page: 2,
    });
  });

  it("ignores or clamps invalid values", () => {
    expect(parse("category=toys&sort=random&min=-5&max=9999&page=abc")).toEqual({
      ...DEFAULT_FILTERS,
      maxPrice: 150,
    });
    expect(parse("min=80&max=20")).toMatchObject({ minPrice: 20, maxPrice: 80 });
  });

  it("round-trips through toShopSearchParams", () => {
    const filters = parse("q=lamp&category=home&max=100&sort=rating");
    expect(parseShopParams(toShopSearchParams(filters))).toEqual(filters);
    expect(toShopSearchParams(DEFAULT_FILTERS).toString()).toBe("");
  });
});

describe("filterProducts", () => {
  it("filters by category", () => {
    const result = filterProducts(products, { ...DEFAULT_FILTERS, category: "desk" });
    expect(result).toHaveLength(4);
    expect(result.every((p) => p.category === "desk")).toBe(true);
  });

  it("searches name, tagline and tags with every term", () => {
    const names = filterProducts(products, { ...DEFAULT_FILTERS, q: "coffee glass" }).map(
      (p) => p.name,
    );
    expect(names).toEqual(["Slow Morning Pour-Over Set"]);
  });

  it("filters by price range in dollars", () => {
    const result = filterProducts(products, {
      ...DEFAULT_FILTERS,
      minPrice: 40,
      maxPrice: 60,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.price >= 4000 && p.price <= 6000)).toBe(true);
  });

  it("sorts by price and rating", () => {
    const asc = filterProducts(products, { ...DEFAULT_FILTERS, sort: "price-asc" });
    expect(asc.map((p) => p.price)).toEqual(
      [...asc.map((p) => p.price)].sort((a, b) => a - b),
    );
    const desc = filterProducts(products, { ...DEFAULT_FILTERS, sort: "price-desc" });
    expect(desc[0].price).toBe(Math.max(...products.map((p) => p.price)));
    const rating = filterProducts(products, { ...DEFAULT_FILTERS, sort: "rating" });
    expect(rating[0].rating).toBe(Math.max(...products.map((p) => p.rating)));
  });

  it("puts featured products first by default", () => {
    const result = filterProducts(products, DEFAULT_FILTERS);
    const featuredCount = products.filter((p) => p.featured).length;
    expect(result.slice(0, featuredCount).every((p) => p.featured)).toBe(true);
  });

  it("does not mutate the input array", () => {
    const copy = [...products];
    filterProducts(products, { ...DEFAULT_FILTERS, sort: "price-desc" });
    expect(products).toEqual(copy);
  });
});
