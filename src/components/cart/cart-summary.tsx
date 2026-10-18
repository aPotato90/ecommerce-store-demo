import { formatPrice } from "@/lib/format";
import type { CartTotals, PriceLineInput } from "@/lib/shop/pricing";
import { cn } from "@/lib/utils";

export function CartSummary({
  totals,
  className,
}: {
  totals: CartTotals<PriceLineInput>;
  className?: string;
}) {
  return (
    <dl className={cn("space-y-2 text-sm", className)}>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Shipping</dt>
        <dd className="tabular-nums">
          {totals.shipping === 0 && totals.itemCount > 0
            ? "Free"
            : formatPrice(totals.shipping)}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Tax (7.5%)</dt>
        <dd className="tabular-nums">{formatPrice(totals.tax)}</dd>
      </div>
      <div className="flex justify-between border-t pt-2 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatPrice(totals.total)}</dd>
      </div>
    </dl>
  );
}
