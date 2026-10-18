import { TruckIcon } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shop/pricing";

export function FreeShippingProgress({ subtotal }: { subtotal: number }) {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const percent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const label =
    remaining === 0
      ? "You've unlocked free shipping."
      : `Add ${formatPrice(remaining)} more for free shipping.`;

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm">
        <TruckIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
        <span>{label}</span>
      </p>
      <div
        role="progressbar"
        aria-label="Progress towards free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={label}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
