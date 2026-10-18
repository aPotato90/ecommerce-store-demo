import { CATEGORIES, type Category, type Product } from "./types";

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const PAGE_SIZE = 8;
/** Bounds of the price slider, in whole naira (URL params use naira, prices use kobo). */
export const PRICE_FLOOR = 0;
export const PRICE_CEILING = 120_000;
export const PRICE_STEP = 5_000;

export type ShopFilters = {
  q: string;
  category: Category | null;
  /** Whole naira. */
  minPrice: number;
  maxPrice: number;
  sort: SortOption;
  page: number;
};

export const DEFAULT_FILTERS: ShopFilters = {
  q: "",
  category: null,
  minPrice: PRICE_FLOOR,
  maxPrice: PRICE_CEILING,
  sort: "featured",
  page: 1,
};

type ParamsLike = { get(name: string): string | null };

function parseIntInRange(
  value: string | null,
  min: number,
  max: number,
  fallback: number,
) {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Math.min(max, Math.max(min, parsed));
}

/** Parses URL search params into filters, ignoring anything invalid. */
export function parseShopParams(params: ParamsLike): ShopFilters {
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  const rawCategory = params.get("category");
  const category = CATEGORIES.includes(rawCategory as Category)
    ? (rawCategory as Category)
    : null;
  let minPrice = parseIntInRange(
    params.get("min"),
    PRICE_FLOOR,
    PRICE_CEILING,
    PRICE_FLOOR,
  );
  let maxPrice = parseIntInRange(
    params.get("max"),
    PRICE_FLOOR,
    PRICE_CEILING,
    PRICE_CEILING,
  );
  if (minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
  const rawSort = params.get("sort");
  const sort = SORT_OPTIONS.some((option) => option.value === rawSort)
    ? (rawSort as SortOption)
    : "featured";
  const page = parseIntInRange(params.get("page"), 1, 50, 1);
  return { q, category, minPrice, maxPrice, sort, page };
}

/** Serialises filters back to a query string, omitting defaults to keep URLs short. */
export function toShopSearchParams(filters: ShopFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.minPrice !== PRICE_FLOOR) params.set("min", String(filters.minPrice));
  if (filters.maxPrice !== PRICE_CEILING) params.set("max", String(filters.maxPrice));
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

function matchesQuery(product: Product, query: string) {
  if (!query) return true;
  const haystack = [product.name, product.tagline, product.category, ...product.tags]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

/** Filters and sorts the catalogue. Does not paginate. */
export function filterProducts(
  products: readonly Product[],
  filters: ShopFilters,
): Product[] {
  const min = filters.minPrice * 100;
  const max = filters.maxPrice >= PRICE_CEILING ? Infinity : filters.maxPrice * 100;

  const result = products.filter(
    (product) =>
      (!filters.category || product.category === filters.category) &&
      product.price >= min &&
      product.price <= max &&
      matchesQuery(product, filters.q),
  );

  const byName = (a: Product, b: Product) => a.name.localeCompare(b.name);
  switch (filters.sort) {
    case "price-asc":
      return result.sort((a, b) => a.price - b.price || byName(a, b));
    case "price-desc":
      return result.sort((a, b) => b.price - a.price || byName(a, b));
    case "rating":
      return result.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case "featured":
    default:
      // Featured first, then in-stock before sold out, otherwise catalogue order.
      return result.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          Number(b.stock > 0) - Number(a.stock > 0),
      );
  }
}
