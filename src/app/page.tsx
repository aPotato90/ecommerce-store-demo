import Link from "next/link";
import { ArrowRightIcon, RotateCcwIcon, ShieldCheckIcon, TruckIcon } from "lucide-react";

import { ProductCard } from "@/components/product/product-card";
import { ProductImage } from "@/components/product/product-image";
import { Button } from "@/components/ui/button";
import { getFeaturedProducts, getProductBySlug } from "@/lib/shop/catalogue";
import {
  CATEGORIES,
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  type Category,
} from "@/lib/shop/types";

const CATEGORY_COVERS: Record<Category, string> = {
  home: "halden-table-lamp",
  kitchen: "speckled-stoneware-mug-pair",
  desk: "meridian-desk-clock",
  outdoor: "waxed-canvas-daypack",
};

const trustPoints = [
  {
    icon: TruckIcon,
    title: "Free shipping over $75",
    body: "A flat $6 below that. (Nothing actually ships: it's a demo.)",
  },
  {
    icon: RotateCcwIcon,
    title: "30-day returns",
    body: "A fictional policy for a fictional shop, but the UI is real.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Secure test checkout",
    body: "Payments run through Stripe in test mode only. No real cards are charged.",
  },
];

export default function HomePage() {
  const featured = getFeaturedProducts();
  const heroProducts = [
    "aster-ceramic-vase",
    "slow-morning-pour-over-set",
    "trail-insulated-bottle",
  ]
    .map((slug) => getProductBySlug(slug))
    .filter((product) => product !== undefined);

  return (
    <>
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden border-b"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-20 lg:px-8">
          <div className="space-y-6">
            <p className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              The autumn edit · A portfolio demo store
            </p>
            <h1
              id="hero-heading"
              className="text-4xl leading-[1.05] font-semibold sm:text-5xl lg:text-6xl"
            >
              Well-made goods for slow mornings and long weekends.
            </h1>
            <p className="max-w-prose text-lg text-muted-foreground">
              Kestrel &amp; Co. gathers small-batch homeware, kitchen tools, desk
              essentials and outdoor gear that are built to be used every day and kept for
              years.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-11 px-5 text-base">
                <Link href="/shop">
                  Shop the collection <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5 text-base">
                <Link href="/shop?sort=rating">See top rated</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4" aria-hidden="true">
            {heroProducts[0] && (
              <ProductImage
                product={heroProducts[0]}
                alt=""
                className="row-span-2 aspect-auto h-full rounded-2xl"
              />
            )}
            {heroProducts.slice(1).map((product) => (
              <ProductImage
                key={product.id}
                product={product}
                alt=""
                className="rounded-2xl"
              />
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Why shop with us" className="border-b bg-muted/40">
        <ul className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
          {trustPoints.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="featured-heading"
        className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"
      >
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="featured-heading" className="text-2xl font-semibold sm:text-3xl">
              Featured this season
            </h2>
            <p className="mt-1 text-muted-foreground">
              Customer favourites, freshly restocked.
            </p>
          </div>
          <Link
            href="/shop"
            className="hidden shrink-0 items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline sm:inline-flex"
          >
            View all products <ArrowRightIcon aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featured.slice(0, 8).map((product) => (
            <li key={product.id} className="flex">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
        <Button asChild variant="outline" className="mt-6 w-full sm:hidden">
          <Link href="/shop">View all products</Link>
        </Button>
      </section>

      <section
        aria-labelledby="categories-heading"
        className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8"
      >
        <h2 id="categories-heading" className="mb-6 text-2xl font-semibold sm:text-3xl">
          Shop by category
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => {
            const cover = getProductBySlug(CATEGORY_COVERS[category]);
            return (
              <li key={category}>
                <Link
                  href={`/shop?category=${category}`}
                  className="group block overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
                >
                  {cover && (
                    <ProductImage
                      product={cover}
                      alt=""
                      className="aspect-[4/3] transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  )}
                  <span className="block p-4">
                    <span className="flex items-center justify-between font-heading text-xl font-semibold">
                      {CATEGORY_LABELS[category]}
                      <ArrowRightIcon
                        aria-hidden="true"
                        className="size-5 text-primary transition-transform group-hover:translate-x-1"
                      />
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {CATEGORY_BLURBS[category]}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
