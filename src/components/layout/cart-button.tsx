"use client";

import { ShoppingBagIcon } from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/format";

export function CartButton() {
  const { totals, setOpen, hydrated } = useCart();
  const count = totals.itemCount;
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      className="relative"
      onClick={() => setOpen(true)}
      aria-label={`Open cart, ${pluralize(count, "item")}`}
      aria-haspopup="dialog"
    >
      <ShoppingBagIcon aria-hidden="true" />
      {hydrated && count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] leading-none font-semibold text-primary-foreground tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
