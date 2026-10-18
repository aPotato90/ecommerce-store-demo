"use client";

import Link from "next/link";
import { Trash2Icon } from "lucide-react";

import { ProductImage } from "@/components/product/product-image";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { ResolvedCartLine } from "@/lib/shop/catalogue";
import { cn } from "@/lib/utils";

import { useCart } from "./cart-provider";
import { QuantityStepper } from "./quantity-stepper";

export function CartLineItem({
  line,
  lineTotal,
  compact = false,
  onNavigate,
}: {
  line: ResolvedCartLine;
  lineTotal: number;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { updateQuantity, removeItem } = useCart();
  const { product, variant, quantity, maxQuantity } = line;
  const variantName = product.variants?.kind === "size" ? "Size" : "Colour";

  return (
    <li className="flex gap-3 py-4 sm:gap-4">
      <Link
        href={`/shop/${product.slug}`}
        onClick={onNavigate}
        tabIndex={-1}
        aria-hidden="true"
        className={cn(
          "shrink-0 overflow-hidden rounded-lg border",
          compact ? "w-20" : "w-24 sm:w-28",
        )}
      >
        <ProductImage
          product={product}
          variants={product.variants}
          variantId={variant?.id}
          alt=""
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-sans text-sm leading-snug font-semibold">
              <Link
                href={`/shop/${product.slug}`}
                onClick={onNavigate}
                className="rounded-sm hover:underline"
              >
                {product.name}
              </Link>
            </h3>
            {variant && (
              <p className="text-xs text-muted-foreground">
                {variantName}: {variant.label}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {formatPrice(line.unitPrice)} each
            </p>
          </div>
          <p className="text-sm font-semibold tabular-nums">{formatPrice(lineTotal)}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <QuantityStepper
            size="sm"
            value={quantity}
            max={maxQuantity}
            itemName={product.name}
            onChange={(next) => updateQuantity(line.key, next)}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeItem(line.key)}
            className="text-muted-foreground"
          >
            <Trash2Icon aria-hidden="true" />
            Remove<span className="sr-only"> {product.name}</span>
          </Button>
        </div>
        {quantity >= maxQuantity && (
          <p className="text-xs text-muted-foreground">
            {maxQuantity < 10
              ? `Only ${maxQuantity} in stock.`
              : "Maximum per order reached."}
          </p>
        )}
      </div>
    </li>
  );
}
