// Order lifecycle. Mirrors validOrderUpdate() in firestore.rules: keep them in sync.

export const ORDER_STATUSES = [
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** The demo "Advance status" button walks paid → processing → shipped → delivered. */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  paid: "processing",
  processing: "shipped",
  shipped: "delivered",
};

export function nextStatus(status: OrderStatus): OrderStatus | null {
  return NEXT_STATUS[status] ?? null;
}

export function canCancel(status: OrderStatus): boolean {
  return status === "paid" || status === "processing";
}

/** True when firestore.rules allows changing an order from `from` to `to`. */
export function isAllowedTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (to === "cancelled" && canCancel(from)) || nextStatus(from) === to;
}
