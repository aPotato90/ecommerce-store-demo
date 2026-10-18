"use client";

import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { pluralize } from "@/lib/format";

import { CartLineItem } from "./cart-line-item";
import { useCart } from "./cart-provider";
import { CartSummary } from "./cart-summary";
import { CheckoutButton } from "./checkout-button";
import { FreeShippingProgress } from "./free-shipping-progress";

export function CartView() {
  const { lines, totals, hydrated } = useCart();

  if (!hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]" aria-busy="true">
        <div className="space-y-4">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="size-28 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
        <span className="sr-only">Loading your cart…</span>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
        <ShoppingBagIcon aria-hidden="true" className="size-12 text-muted-foreground" />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Your cart is empty</h2>
          <p className="text-muted-foreground">
            Find something you love in the shop. Your cart is saved on this device.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      <section aria-labelledby="cart-items-heading">
        <h2 id="cart-items-heading" className="sr-only">
          Items ({pluralize(totals.itemCount, "item")})
        </h2>
        <ul className="divide-y border-y">
          {totals.lines.map((line) => (
            <CartLineItem key={line.key} line={line} lineTotal={line.lineTotal} />
          ))}
        </ul>
        <Link
          href="/shop"
          className="mt-4 inline-block rounded-sm text-sm font-medium text-primary hover:underline"
        >
          ← Continue shopping
        </Link>
      </section>

      <section
        aria-labelledby="summary-heading"
        className="space-y-5 rounded-xl border bg-card p-5 lg:sticky lg:top-24"
      >
        <h2 id="summary-heading" className="text-xl font-semibold">
          Order summary
        </h2>
        <FreeShippingProgress subtotal={totals.subtotal} />
        <CartSummary totals={totals} />
        <CheckoutButton />
        <p className="text-xs text-muted-foreground">
          Prices are re-checked on the server at checkout. This is a demo: no real orders
          are placed and no real payments are taken.
        </p>
      </section>
    </div>
  );
}
