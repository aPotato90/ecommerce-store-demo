import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { CATEGORY_LABELS, type Product } from "@/lib/shop/types";

import { ProductImage } from "./product-image";
import { Rating } from "./rating";
import { StockBadge } from "./stock-badge";

export function ProductCard({
  product,
  headingLevel = "h3",
}: {
  product: Product;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow focus-within:shadow-md hover:shadow-md">
      <div className="relative overflow-hidden">
        <ProductImage
          product={product}
          alt=""
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {product.featured && <Badge>Featured</Badge>}
          <StockBadge stock={product.stock} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {CATEGORY_LABELS[product.category]}
        </p>
        <Heading className="font-sans text-base leading-snug font-semibold">
          <Link
            href={`/shop/${product.slug}`}
            className="rounded-sm after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
          >
            {product.name}
          </Link>
        </Heading>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.tagline}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2">
          <p className="text-base font-semibold">
            <span className="sr-only">Price: </span>
            {formatPrice(product.price)}
          </p>
          <Rating rating={product.rating} reviewCount={product.reviewCount} />
        </div>
      </div>
    </article>
  );
}
