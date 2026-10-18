import { Badge } from "@/components/ui/badge";

export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge variant="secondary">Sold out</Badge>;
  if (stock <= 5)
    return (
      <Badge
        variant="outline"
        className="border-transparent bg-background/90 text-foreground"
      >
        Only {stock} left
      </Badge>
    );
  return null;
}
