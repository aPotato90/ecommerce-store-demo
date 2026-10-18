import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton";
import { ShopBrowser } from "@/components/shop/shop-browser";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Shop all products",
  description:
    "Browse the full Kestrel & Co. demo catalogue: homeware, kitchen tools, desk essentials and outdoor gear.",
};

function ShopFallback() {
  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]" aria-busy="true">
      <div className="space-y-4">
        <Skeleton className="h-4 w-20" />
        <div className="flex flex-wrap gap-2 lg:flex-col">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-24 lg:w-full" />
          ))}
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="space-y-5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-48" />
        <ProductGridSkeleton count={6} />
      </div>
      <span className="sr-only">Loading products…</span>
    </div>
  );
}

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">Shop all products</h1>
        <p className="max-w-prose text-muted-foreground">
          Sixteen fictional products across four categories. Search, filter and sort:
          everything is kept in the URL so you can share or bookmark any view.
        </p>
      </header>
      <Suspense fallback={<ShopFallback />}>
        <ShopBrowser />
      </Suspense>
    </div>
  );
}
