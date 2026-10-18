import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

const STYLES: Record<OrderStatus, string> = {
  paid: "bg-primary text-primary-foreground",
  processing: "border-transparent bg-amber-200 text-amber-950 dark:bg-amber-300",
  shipped: "border-transparent bg-sky-200 text-sky-950 dark:bg-sky-300",
  delivered: "border-transparent bg-emerald-200 text-emerald-950 dark:bg-emerald-300",
  cancelled: "border-transparent bg-muted text-muted-foreground",
};

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return <Badge className={cn(STYLES[status], className)}>{STATUS_LABELS[status]}</Badge>;
}
