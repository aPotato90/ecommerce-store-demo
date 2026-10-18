"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  PackageSearchIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { products } from "@/data/products";
import {
  DEFAULT_FILTERS,
  filterProducts,
  PAGE_SIZE,
  parseShopParams,
  PRICE_CEILING,
  PRICE_FLOOR,
  PRICE_STEP,
  SORT_OPTIONS,
  toShopSearchParams,
  type ShopFilters,
  type SortOption,
} from "@/lib/shop/filters";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/shop/types";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

const nairaFormat = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});
const formatNaira = (naira: number) => nairaFormat.format(naira);

function priceLabel(naira: number) {
  const label = formatNaira(naira);
  return naira >= PRICE_CEILING ? `${label}+` : label;
}

export function ShopBrowser() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // The URL is the single source of truth for filters.
  const filters = useMemo(() => parseShopParams(searchParams), [searchParams]);
  const results = useMemo(() => filterProducts(products, filters), [filters]);
  const visibleCount = Math.min(results.length, filters.page * PAGE_SIZE);
  const visible = results.slice(0, visibleCount);

  function navigate(next: Partial<ShopFilters>) {
    const merged = { ...filters, page: 1, ...next };
    const query = toShopSearchParams(merged).toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  // Search input: local draft, debounced into the URL. Resets when the URL changes elsewhere
  // (for example a search from the header).
  const [draft, setDraft] = useState(filters.q);
  const [syncedQ, setSyncedQ] = useState(filters.q);
  if (syncedQ !== filters.q) {
    setSyncedQ(filters.q);
    setDraft(filters.q);
  }
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(debounce.current ?? undefined), []);
  function onSearchChange(value: string) {
    setDraft(value);
    clearTimeout(debounce.current ?? undefined);
    debounce.current = setTimeout(
      () => navigate({ q: value.trim() }),
      SEARCH_DEBOUNCE_MS,
    );
  }

  // Price slider: local while dragging, committed to the URL on release.
  const [price, setPrice] = useState<[number, number]>([
    filters.minPrice,
    filters.maxPrice,
  ]);
  const [syncedPrice, setSyncedPrice] = useState(
    `${filters.minPrice}-${filters.maxPrice}`,
  );
  if (syncedPrice !== `${filters.minPrice}-${filters.maxPrice}`) {
    setSyncedPrice(`${filters.minPrice}-${filters.maxPrice}`);
    setPrice([filters.minPrice, filters.maxPrice]);
  }

  // Focus the "#shop-search" field when arriving from the header search icon.
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (window.location.hash === "#shop-search") searchInput.current?.focus();
  }, []);

  // After "Load more", move focus to the first newly revealed product.
  const listRef = useRef<HTMLUListElement>(null);
  const focusFromIndex = useRef<number | null>(null);
  useEffect(() => {
    const index = focusFromIndex.current;
    if (index === null) return;
    focusFromIndex.current = null;
    listRef.current?.querySelectorAll<HTMLAnchorElement>("li a")[index]?.focus();
  }, [visibleCount]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount =
    Number(filters.category !== null) +
    Number(filters.minPrice !== PRICE_FLOOR || filters.maxPrice !== PRICE_CEILING);

  const hasActiveFilters =
    filters.q !== "" ||
    filters.category !== null ||
    filters.minPrice !== PRICE_FLOOR ||
    filters.maxPrice !== PRICE_CEILING;

  function clearFilters() {
    clearTimeout(debounce.current ?? undefined);
    navigate({ ...DEFAULT_FILTERS, sort: filters.sort });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="shop-search">Search</Label>
          <div className="relative">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={searchInput}
              id="shop-search"
              type="search"
              value={draft}
              maxLength={80}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Try “linen”, “coffee” or “camping”"
              autoComplete="off"
              className="h-10 pl-9"
            />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5 sm:w-52 sm:flex-none">
            <Label htmlFor="shop-sort">Sort by</Label>
            <Select
              value={filters.sort}
              onValueChange={(value) => navigate({ sort: value as SortOption })}
            >
              <SelectTrigger
                id="shop-sort"
                className="h-10 w-full data-[size=default]:h-10"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 lg:hidden"
            aria-expanded={filtersOpen}
            aria-controls="shop-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontalIcon aria-hidden="true" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {activeFilterCount}
                <span className="sr-only"> active</span>
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside
          id="shop-filters"
          aria-label="Filters"
          className={cn(
            "space-y-6 rounded-xl border p-4 lg:sticky lg:top-24 lg:block lg:self-start lg:border-0 lg:p-0",
            !filtersOpen && "hidden",
          )}
        >
          <fieldset className="space-y-3">
            <legend className="mb-3 text-sm font-semibold">Category</legend>
            <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
              {[null, ...CATEGORIES].map((category: Category | null) => {
                const active = filters.category === category;
                return (
                  <Button
                    key={category ?? "all"}
                    type="button"
                    variant={active ? "default" : "outline"}
                    aria-pressed={active}
                    onClick={() => navigate({ category })}
                    className="h-9 lg:justify-start"
                  >
                    {category ? CATEGORY_LABELS[category] : "All products"}
                  </Button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-3 text-sm font-semibold">Price</legend>
            <Slider
              min={PRICE_FLOOR}
              max={PRICE_CEILING}
              step={PRICE_STEP}
              minStepsBetweenThumbs={1}
              value={price}
              onValueChange={(value) => setPrice([value[0], value[1]])}
              onValueCommit={(value) =>
                navigate({ minPrice: value[0], maxPrice: value[1] })
              }
              thumbLabels={["Minimum price", "Maximum price"]}
              thumbValueText={(value) => priceLabel(value)}
              className="py-2"
            />
            <p className="flex justify-between text-sm text-muted-foreground tabular-nums">
              <span>{priceLabel(price[0])}</span>
              <span>{priceLabel(price[1])}</span>
            </p>
          </fieldset>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={clearFilters}
              className="w-full"
            >
              <XIcon aria-hidden="true" /> Clear filters
            </Button>
          )}
        </aside>

        <div className="min-w-0 space-y-5">
          <p role="status" className="text-sm text-muted-foreground">
            {results.length === 0
              ? "No products match your filters."
              : `Showing ${visibleCount} of ${results.length} ${results.length === 1 ? "product" : "products"}${
                  filters.category ? ` in ${CATEGORY_LABELS[filters.category]}` : ""
                }${filters.q ? ` for “${filters.q}”` : ""}.`}
          </p>

          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
              <PackageSearchIcon
                aria-hidden="true"
                className="size-12 text-muted-foreground"
              />
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Nothing found</h2>
                <p className="text-muted-foreground">
                  Try a different search term, widen the price range or pick another
                  category.
                </p>
              </div>
              <Button type="button" onClick={clearFilters}>
                Clear all filters
              </Button>
            </div>
          ) : (
            <>
              <ul
                ref={listRef}
                aria-label="Products"
                aria-busy={isPending}
                className={cn(
                  "grid grid-cols-2 gap-3 transition-opacity sm:gap-4 md:grid-cols-3 xl:grid-cols-3",
                  isPending && "opacity-60",
                )}
              >
                {visible.map((product) => (
                  <li key={product.id} className="flex">
                    <ProductCard product={product} headingLevel="h2" />
                  </li>
                ))}
              </ul>
              {visibleCount < results.length && (
                <div className="flex justify-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-11 px-6"
                    onClick={() => {
                      focusFromIndex.current = visibleCount;
                      navigate({ page: filters.page + 1 });
                    }}
                  >
                    Load more ({results.length - visibleCount} more)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
