import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";
import { z } from "zod";

import type { VerifiedOrder } from "@/lib/checkout/service";
import {
  isAllowedTransition,
  ORDER_STATUSES,
  type OrderStatus,
} from "@/lib/orders/status";
import { MAX_QUANTITY_PER_LINE } from "@/lib/shop/schemas";

import { getFirebaseServices } from "./client";

/** Must match the limits enforced in firestore.rules. */
export const ORDER_LIMITS = {
  maxItems: 6,
  maxNameLength: 120,
  maxIdLength: 64,
  maxEmailLength: 254,
  /** ₦1,000,000 per unit, in kobo. */
  maxUnitPriceKobo: 100_000_000,
  /** ₦10,000,000 per order amount, in kobo. */
  maxAmountKobo: 1_000_000_000,
} as const;

export { ORDER_STATUSES, type OrderStatus };

const kobo = z.number().int().min(0).max(ORDER_LIMITS.maxAmountKobo);

export const orderItemSchema = z.object({
  productId: z.string().min(1).max(ORDER_LIMITS.maxIdLength),
  name: z.string().min(1).max(ORDER_LIMITS.maxNameLength),
  /** Unit price in kobo, taken from the server-side catalogue at checkout. */
  unitPrice: z.number().int().min(0).max(ORDER_LIMITS.maxUnitPriceKobo),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
  /** Variant id, e.g. "sage". */
  variant: z.string().min(1).max(ORDER_LIMITS.maxIdLength).nullable(),
});

export const orderAmountsSchema = z
  .object({ subtotal: kobo, shipping: kobo, tax: kobo, total: kobo })
  .refine((a) => a.total === a.subtotal + a.shipping + a.tax, "total must add up");

/** Shape of a document at users/{uid}/orders/{paystackReference}. */
export const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(ORDER_LIMITS.maxItems),
  amounts: orderAmountsSchema,
  currency: z.literal("NGN"),
  status: z.enum(ORDER_STATUSES),
  /** Paystack transaction reference; also the document id. */
  paystackReference: z.string().regex(/^kc-[0-9a-f]{32}$/),
  createdAt: z.instanceof(Timestamp),
  customerEmail: z.email().max(ORDER_LIMITS.maxEmailLength),
  customer: z.object({
    fullName: z.string().min(1).max(80),
    phone: z.string().min(1).max(15),
    address: z.string().min(1).max(300),
  }),
});

export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderDocument = z.infer<typeof orderSchema>;
export type Order = OrderDocument & { id: string };

/** Validates documents on read so a malformed order can't break the UI. */
function toOrder(snapshot: DocumentSnapshot<DocumentData>): Order | null {
  const parsed = orderSchema.safeParse(snapshot.data());
  return parsed.success ? { id: snapshot.id, ...parsed.data } : null;
}

export function ordersCollectionPath(uid: string) {
  return `users/${uid}/orders`;
}

export async function fetchOrders(uid: string, max = 25): Promise<Order[]> {
  const { db } = getFirebaseServices();
  const snapshot = await getDocs(
    query(
      collection(db, ordersCollectionPath(uid)),
      orderBy("createdAt", "desc"),
      limit(max),
    ),
  );
  return snapshot.docs.map(toOrder).filter((order) => order !== null);
}

export type FetchOrderResult =
  { kind: "found"; order: Order } | { kind: "missing" } | { kind: "invalid" };

export async function fetchOrder(
  uid: string,
  orderId: string,
): Promise<FetchOrderResult> {
  const { db } = getFirebaseServices();
  const snapshot = await getDoc(doc(db, ordersCollectionPath(uid), orderId));
  if (!snapshot.exists()) return { kind: "missing" };
  const order = toOrder(snapshot);
  return order ? { kind: "found", order } : { kind: "invalid" };
}

/**
 * Saves a server-verified order under its Paystack reference. Idempotent: if the order is
 * already there (callback refreshed or visited twice) nothing is written.
 */
export async function saveVerifiedOrder(
  uid: string,
  order: VerifiedOrder,
): Promise<"saved" | "already_saved"> {
  const { db } = getFirebaseServices();
  const ref = doc(db, ordersCollectionPath(uid), order.reference);
  const existing = await getDoc(ref);
  if (existing.exists()) return "already_saved";

  await setDoc(ref, {
    items: order.items,
    amounts: order.amounts,
    currency: "NGN",
    status: "paid",
    paystackReference: order.reference,
    createdAt: serverTimestamp(),
    customerEmail: order.customerEmail,
    customer: order.customer,
  });
  return "saved";
}

export async function updateOrderStatus(
  uid: string,
  order: Pick<Order, "id" | "status">,
  to: OrderStatus,
): Promise<void> {
  if (!isAllowedTransition(order.status, to)) {
    throw new Error(`An order can't go from ${order.status} to ${to}.`);
  }
  const { db } = getFirebaseServices();
  await updateDoc(doc(db, ordersCollectionPath(uid), order.id), { status: to });
}
