import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { z } from "zod";

import { MAX_QUANTITY_PER_LINE } from "@/lib/shop/schemas";

import { getFirebaseServices } from "./client";

/** Must match the limits enforced in firestore.rules. */
export const ORDER_LIMITS = {
  maxItems: 6,
  maxNameLength: 120,
  maxIdLength: 64,
  maxEmailLength: 254,
  maxAmountCents: 10_000_000,
} as const;

export const ORDER_STATUSES = [
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const cents = z.number().int().min(0).max(ORDER_LIMITS.maxAmountCents);

export const orderItemSchema = z.object({
  productId: z.string().min(1).max(ORDER_LIMITS.maxIdLength),
  name: z.string().min(1).max(ORDER_LIMITS.maxNameLength),
  /** Unit price in cents, taken from the server-side catalogue at checkout. */
  unitPrice: cents,
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
  variant: z.string().min(1).max(ORDER_LIMITS.maxIdLength).nullable(),
});

export const orderAmountsSchema = z
  .object({ subtotal: cents, shipping: cents, tax: cents, total: cents })
  .refine((a) => a.total === a.subtotal + a.shipping + a.tax, "total must add up");

/** Shape of a document at users/{uid}/orders/{orderId}. */
export const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(ORDER_LIMITS.maxItems),
  amounts: orderAmountsSchema,
  status: z.enum(ORDER_STATUSES),
  stripeSessionId: z
    .string()
    .regex(/^cs_test_[A-Za-z0-9_]+$/)
    .max(255),
  createdAt: z.instanceof(Timestamp),
  customerEmail: z.email().max(ORDER_LIMITS.maxEmailLength),
});

export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderDocument = z.infer<typeof orderSchema>;
export type Order = OrderDocument & { id: string };

/** Validates documents on read so a malformed order can't break the UI. */
const orderConverter: FirestoreDataConverter<Order | null> = {
  toFirestore: (order) => order as DocumentData,
  fromFirestore: (snapshot: QueryDocumentSnapshot) => {
    const parsed = orderSchema.safeParse(snapshot.data());
    return parsed.success ? { id: snapshot.id, ...parsed.data } : null;
  },
};

export function ordersCollectionPath(uid: string) {
  return `users/${uid}/orders`;
}

export async function fetchOrders(uid: string, max = 25): Promise<Order[]> {
  const { db } = getFirebaseServices();
  const snapshot = await getDocs(
    query(
      collection(db, ordersCollectionPath(uid)).withConverter(orderConverter),
      orderBy("createdAt", "desc"),
      limit(max),
    ),
  );
  return snapshot.docs.map((doc) => doc.data()).filter((order) => order !== null);
}
