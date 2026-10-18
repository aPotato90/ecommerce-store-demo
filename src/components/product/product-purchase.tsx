"use client";

import { ShoppingBagIcon } from "lucide-react";
import { useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { Button } from "@/components/ui/button";
import { maxQuantityFor } from "@/lib/shop/catalogue";
import type { Product } from "@/lib/shop/types";
import { cn } from "@/lib/utils";

import { ProductImage } from "./product-image";
import { StockBadge } from "./stock-badge";

/**
 * Image + buy box. Lives in one client component so the illustration follows the selected
 * colour. Server-rendered product info is passed in as children.
 */
export function ProductPurchase({
  product,
  children,
}: {
  product: Product;
  children: React.ReactNode;
}) {
  const { addItem } = useCart();
  const options = product.variants?.options ?? [];
  const [variantId, setVariantId] = useState<string | null>(options[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const max = maxQuantityFor(product);
  const soldOut = max === 0;
  const selected = options.find((option) => option.id === variantId);
  const variantName = product.variants?.kind === "size" ? "Size" : "Colour";

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
      <div className="overflow-hidden rounded-2xl border md:sticky md:top-24 md:self-start">
        <ProductImage
          product={product}
          variants={product.variants}
          variantId={variantId}
          alt={`Illustration of the ${product.name}${selected ? ` in ${selected.label}` : ""}`}
        />
      </div>

      <div className="space-y-6">
        {children}

        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!soldOut) addItem(product, variantId, quantity);
          }}
        >
          {product.variants && (
            <fieldset>
              <legend className="mb-3 text-sm font-semibold">
                {variantName}: <span className="font-normal">{selected?.label}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                  const checked = option.id === variantId;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                        checked
                          ? "border-primary bg-primary/10 font-medium"
                          : "hover:bg-muted",
                      )}
                    >
                      <input
                        type="radio"
                        name="variant"
                        value={option.id}
                        checked={checked}
                        onChange={() => setVariantId(option.id)}
                        className="sr-only"
                      />
                      {option.swatch && (
                        <span
                          aria-hidden="true"
                          className="size-4 rounded-full border border-black/15"
                          style={{ backgroundColor: option.swatch }}
                        />
                      )}
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold">Quantity</p>
              <StockBadge stock={product.stock} />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {!soldOut && (
                <QuantityStepper
                  value={quantity}
                  max={max}
                  onChange={setQuantity}
                  itemName={product.name}
                  className="self-start"
                />
              )}
              <Button
                type="submit"
                size="lg"
                className="h-11 flex-1 text-base"
                disabled={soldOut}
              >
                <ShoppingBagIcon aria-hidden="true" />
                {soldOut ? "Sold out" : "Add to cart"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {soldOut
                ? "This item is out of stock in our demo warehouse."
                : `In stock: ${product.stock}. Limit ${max} per order.`}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
