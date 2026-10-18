import { formatPrice } from "@/lib/format";
import { getProductById } from "@/lib/shop/catalogue";

type Line = {
  key: string;
  productId: string;
  name: string;
  variant: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

/** Variant label for display ("Sage"), falling back to the stored id. */
export function variantLabel(productId: string, variant: string | null): string | null {
  if (!variant) return null;
  const product = getProductById(productId);
  const option = product?.variants?.options.find((o) => o.id === variant);
  const kind = product?.variants?.kind === "size" ? "Size" : "Colour";
  return `${kind}: ${option?.label ?? variant}`;
}

export function OrderLines({ lines }: { lines: Line[] }) {
  return (
    <ul className="divide-y" aria-label="Items">
      {lines.map((line) => {
        const variant = variantLabel(line.productId, line.variant);
        return (
          <li key={line.key} className="flex justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{line.name}</p>
              <p className="text-muted-foreground">
                {variant && <>{variant} · </>}
                {line.quantity} × {formatPrice(line.unitPrice)}
              </p>
            </div>
            <p className="shrink-0 font-medium tabular-nums">
              {formatPrice(line.lineTotal)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
