import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, ChevronRightIcon } from "lucide-react";

import { ProductCard } from "@/components/product/product-card";
import { Rating } from "@/components/product/rating";
import { ProductPurchase } from "@/components/product/product-purchase";
import { formatPrice } from "@/lib/format";
import {
  getAllProducts,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/shop/catalogue";
import { CATEGORY_LABELS } from "@/lib/shop/types";

export function generateStaticParams() {
  return getAllProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  const description = `${product.tagline} ${formatPrice(product.price)} at Kestrel & Co. (demo store).`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: { title: product.name, description, type: "website" },
  };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const related = getRelatedProducts(product);
  const categoryLabel = CATEGORY_LABELS[product.category];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
          <li>
            <Link
              href="/shop"
              className="rounded-sm hover:text-foreground hover:underline"
            >
              All products
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRightIcon className="size-4" />
          </li>
          <li>
            <Link
              href={`/shop?category=${product.category}`}
              className="rounded-sm hover:text-foreground hover:underline"
            >
              {categoryLabel}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRightIcon className="size-4" />
          </li>
          <li>
            <span aria-current="page" className="text-foreground">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      <ProductPurchase product={product}>
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            {categoryLabel}
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">{product.name}</h1>
          <p className="text-lg text-muted-foreground">{product.tagline}</p>
          <Rating rating={product.rating} reviewCount={product.reviewCount} size="md" />
          <p className="text-2xl font-semibold">
            <span className="sr-only">Price: </span>
            {formatPrice(product.price)}
          </p>
        </div>
      </ProductPurchase>

      <section
        aria-labelledby="details-heading"
        className="mt-12 grid gap-8 md:grid-cols-2"
      >
        <div className="space-y-3">
          <h2 id="details-heading" className="text-2xl font-semibold">
            About this product
          </h2>
          <p className="leading-relaxed text-muted-foreground">{product.description}</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">Details</h2>
          <ul className="space-y-2">
            {product.details.map((detail) => (
              <li key={detail} className="flex gap-2 text-muted-foreground">
                <CheckIcon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-primary"
                />
                {detail}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Tags:{" "}
            {product.tags.map((tag, i) => (
              <span key={tag}>
                <Link
                  href={`/shop?q=${encodeURIComponent(tag)}`}
                  className="rounded-sm underline underline-offset-4 hover:text-foreground"
                >
                  {tag}
                </Link>
                {i < product.tags.length - 1 && ", "}
              </span>
            ))}
          </p>
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16">
          <h2 id="related-heading" className="mb-6 text-2xl font-semibold">
            You might also like
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((item) => (
              <li key={item.id} className="flex">
                <ProductCard product={item} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
