"use client";

import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { pluralize } from "@/lib/format";

import { CartLineItem } from "./cart-line-item";
import { useCart } from "./cart-provider";
import { CartSummary } from "./cart-summary";
import { FreeShippingProgress } from "./free-shipping-progress";

export function CartDrawer() {
  const { isOpen, setOpen, lines, totals } = useCart();
  const close = () => setOpen(false);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="font-heading text-xl">Your cart</SheetTitle>
          <SheetDescription>
            {totals.itemCount === 0
              ? "Your cart is empty."
              : `${pluralize(totals.itemCount, "item")} in your cart.`}
          </SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <ShoppingBagIcon
              aria-hidden="true"
              className="size-12 text-muted-foreground"
            />
            <p className="text-muted-foreground">
              Nothing here yet. Let&apos;s fix that.
            </p>
            <Button asChild onClick={close}>
              <Link href="/shop">Browse the shop</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b px-4 py-3">
              <FreeShippingProgress subtotal={totals.subtotal} />
            </div>
            <ul className="flex-1 divide-y overflow-y-auto px-4" aria-label="Cart items">
              {totals.lines.map((line) => (
                <CartLineItem
                  key={line.key}
                  line={line}
                  lineTotal={line.lineTotal}
                  compact
                  onNavigate={close}
                />
              ))}
            </ul>
            <SheetFooter className="gap-3 border-t">
              <CartSummary totals={totals} />
              <Button asChild size="lg" className="h-11 w-full text-base">
                <Link href="/cart" onClick={close}>
                  View cart and checkout
                </Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Demo store: no real orders are placed.
              </p>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
