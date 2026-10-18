import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "demo-kestrel";
const ALICE = "alice";
const BOB = "bob";
/** Orders are stored under their Paystack reference: "kc-" + 32 hex chars. */
const REF = "kc-0123456789abcdef0123456789abcdef";
const REF2 = "kc-fedcba9876543210fedcba9876543210";
const STATUSES = ["paid", "processing", "shipped", "delivered", "cancelled"] as const;

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8"),
    },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
});

afterAll(async () => {
  await env?.cleanup();
});

function validOrder(overrides: Record<string, unknown> = {}, reference = REF) {
  return {
    items: [
      {
        productId: "prd_aster_vase",
        name: "Aster Ceramic Vase",
        unitPrice: 1_850_000,
        quantity: 2,
        variant: "sage",
      },
      {
        productId: "prd_pourover_set",
        name: "Slow Morning Pour-Over Set",
        unitPrice: 3_200_000,
        quantity: 1,
        variant: null,
      },
    ],
    // Amounts in kobo: ₦69,000 subtotal + ₦3,500 shipping + 7.5% VAT.
    amounts: { subtotal: 6_900_000, shipping: 350_000, tax: 517_500, total: 7_767_500 },
    currency: "NGN",
    status: "paid",
    paystackReference: reference,
    createdAt: serverTimestamp(),
    customerEmail: "jamie@example.com",
    customer: {
      fullName: "Jamie Demo",
      phone: "08030000000",
      address: "1 Example Close, Ikeja, Lagos",
    },
    ...overrides,
  };
}

const item = (n: number) => ({
  productId: `prd_${n}`,
  name: `Item ${n}`,
  unitPrice: 100,
  quantity: 1,
  variant: null,
});

function db(uid: string | null) {
  return uid
    ? env.authenticatedContext(uid).firestore()
    : env.unauthenticatedContext().firestore();
}

const orderPath = (uid: string, id = REF) => `users/${uid}/orders/${id}`;

async function seedOrder(uid: string, id = REF, data: Record<string, unknown> = {}) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), orderPath(uid, id)), {
      ...validOrder({ createdAt: Timestamp.now() }, id),
      ...data,
    });
  });
}

describe("default deny", () => {
  it("denies reads and writes outside users/{uid}", async () => {
    await assertFails(getDoc(doc(db(ALICE), "products/prd_aster_vase")));
    await assertFails(setDoc(doc(db(ALICE), "products/prd_x"), { price: 1 }));
    await assertFails(getDocs(collection(db(ALICE), "users")));
  });

  it("denies unauthenticated access to orders", async () => {
    await seedOrder(ALICE);
    await assertFails(getDoc(doc(db(null), orderPath(ALICE))));
    await assertFails(
      setDoc(doc(db(null), orderPath(ALICE, REF2)), validOrder({}, REF2)),
    );
  });

  it("denies unknown subcollections even for the owner", async () => {
    await assertFails(setDoc(doc(db(ALICE), `users/${ALICE}/secrets/s1`), { a: 1 }));
    await assertFails(getDoc(doc(db(ALICE), `users/${ALICE}/secrets/s1`)));
  });
});

describe("orders: ownership", () => {
  it("lets the owner create, read and list their orders", async () => {
    const alice = db(ALICE);
    await assertSucceeds(setDoc(doc(alice, orderPath(ALICE)), validOrder()));
    await assertSucceeds(getDoc(doc(alice, orderPath(ALICE))));
    await assertSucceeds(getDocs(collection(alice, `users/${ALICE}/orders`)));
  });

  it("blocks other users from reading or writing someone else's orders", async () => {
    await seedOrder(ALICE);
    const bob = db(BOB);
    await assertFails(getDoc(doc(bob, orderPath(ALICE))));
    await assertFails(getDocs(collection(bob, `users/${ALICE}/orders`)));
    await assertFails(setDoc(doc(bob, orderPath(ALICE, REF2)), validOrder({}, REF2)));
    await assertFails(updateDoc(doc(bob, orderPath(ALICE)), { status: "cancelled" }));
    await assertFails(updateDoc(doc(bob, orderPath(ALICE)), { status: "processing" }));
  });

  it("never allows deleting orders", async () => {
    await seedOrder(ALICE);
    await assertFails(deleteDoc(doc(db(ALICE), orderPath(ALICE))));
  });
});

describe("orders: one order per Paystack reference", () => {
  it("rejects a second create for the same reference (duplicate callback)", async () => {
    const ref = doc(db(ALICE), orderPath(ALICE));
    await assertSucceeds(setDoc(ref, validOrder()));
    // Writing the same document again is an update that changes createdAt: denied.
    await assertFails(setDoc(ref, validOrder()));
  });

  it("requires the document id to equal the paystackReference field", async () => {
    await assertFails(
      setDoc(doc(db(ALICE), orderPath(ALICE, REF2)), validOrder({}, REF)),
    );
  });

  it.each([
    ["an uppercase reference", "kc-0123456789ABCDEF0123456789ABCDEF"],
    ["a short reference", "kc-0123"],
    ["a reference without the prefix", "0123456789abcdef0123456789abcdef"],
    ["a reference with extra characters", `${REF}.x`],
  ])("rejects %s", async (_label, reference) => {
    await assertFails(
      setDoc(doc(db(ALICE), orderPath(ALICE, reference)), validOrder({}, reference)),
    );
  });
});

describe("orders: create validation", () => {
  const create = (data: Record<string, unknown>) =>
    setDoc(doc(db(ALICE), orderPath(ALICE)), data);

  it.each([
    ["an unknown top-level field", { discount: 100 }],
    ["a leftover Stripe field", { stripeSessionId: "cs_test_a1B2c3" }],
    ["processing as the initial status", { status: "processing" }],
    ["a fulfilment status", { status: "shipped" }],
    ["an invalid status", { status: "refunded" }],
    ["another currency", { currency: "USD" }],
    ["a client timestamp", { createdAt: Timestamp.fromDate(new Date("2020-01-01")) }],
    ["an invalid email", { customerEmail: "not-an-email" }],
    ["a too-long email", { customerEmail: `${"a".repeat(250)}@example.com` }],
    ["no items", { items: [] }],
    ["more than 6 items", { items: Array.from({ length: 7 }, (_, i) => item(i)) }],
    [
      "totals that don't add up",
      { amounts: { subtotal: 100, shipping: 0, tax: 8, total: 1 } },
    ],
    [
      "negative amounts",
      { amounts: { subtotal: -100, shipping: 0, tax: 0, total: -100 } },
    ],
    [
      "fractional kobo",
      { amounts: { subtotal: 10.5, shipping: 0, tax: 0, total: 10.5 } },
    ],
    [
      "amounts over the ₦10,000,000 cap",
      { amounts: { subtotal: 1_000_000_001, shipping: 0, tax: 0, total: 1_000_000_001 } },
    ],
    [
      "an extra amount field",
      { amounts: { subtotal: 1, shipping: 0, tax: 0, total: 1, x: 0 } },
    ],
    ["missing customer details", { customer: null }],
    [
      "an extra customer field",
      {
        customer: {
          fullName: "Jamie",
          phone: "08030000000",
          address: "1 Example Close",
          isAdmin: true,
        },
      },
    ],
    [
      "a malformed phone number",
      { customer: { fullName: "Jamie", phone: "call me", address: "1 Example Close" } },
    ],
    [
      "an over-long address",
      { customer: { fullName: "Jamie", phone: "08030000000", address: "a".repeat(301) } },
    ],
  ])("rejects %s", async (_label, overrides) => {
    await assertFails(create(validOrder(overrides)));
  });

  it("rejects missing required fields", async () => {
    for (const field of ["customerEmail", "currency", "customer", "paystackReference"]) {
      const order: Record<string, unknown> = validOrder();
      delete order[field];
      await assertFails(create(order));
    }
  });

  it.each([
    ["an unknown item field", { ...item(1), sku: "x" }],
    ["a missing variant field", { productId: "p", name: "n", unitPrice: 1, quantity: 1 }],
    ["quantity 0", { ...item(1), quantity: 0 }],
    ["quantity 11", { ...item(1), quantity: 11 }],
    ["a string price", { ...item(1), unitPrice: "100" }],
    ["a negative price", { ...item(1), unitPrice: -1 }],
    ["a unit price over ₦1,000,000", { ...item(1), unitPrice: 100_000_001 }],
    ["a very long name", { ...item(1), name: "x".repeat(121) }],
    ["an empty product id", { ...item(1), productId: "" }],
    ["a numeric variant", { ...item(1), variant: 3 }],
    ["a numeric name", { ...item(1), name: 42 }],
    ["an over-long product id", { ...item(1), productId: "p".repeat(65) }],
  ])("rejects an item with %s", async (_label, badItem) => {
    await assertFails(create(validOrder({ items: [badItem] })));
  });

  it("validates items beyond the first", async () => {
    const items = [
      ...Array.from({ length: 5 }, (_, i) => item(i)),
      { ...item(5), quantity: 99 },
    ];
    await assertFails(create(validOrder({ items })));
  });

  it("accepts a worst-case 6-line order within the rules expression limit", async () => {
    // Longest allowed values everywhere: guards against Firestore's 1000-expression cap.
    const items = Array.from({ length: 6 }, (_, i) => ({
      productId: `prd_${"x".repeat(58)}_${i}`,
      name: "n".repeat(120),
      unitPrice: 100_000_000,
      quantity: 10,
      variant: "v".repeat(64),
    }));
    await assertSucceeds(
      create(
        validOrder({
          items,
          amounts: { subtotal: 1_000_000_000, shipping: 0, tax: 0, total: 1_000_000_000 },
          customerEmail: `${"a".repeat(240)}@example.com`,
          customer: {
            fullName: "n".repeat(80),
            phone: "+2348030000000",
            address: "a".repeat(300),
          },
        }),
      ),
    );
  });
});

describe("orders: status transitions", () => {
  const allowed = new Set([
    "paid->processing",
    "paid->cancelled",
    "processing->shipped",
    "processing->cancelled",
    "shipped->delivered",
  ]);
  const cases = STATUSES.flatMap((from) =>
    STATUSES.filter((to) => to !== from).map((to) => [from, to] as const),
  );

  it.each(cases)("%s -> %s follows the lifecycle", async (from, to) => {
    await seedOrder(ALICE, REF, { status: from });
    const update = updateDoc(doc(db(ALICE), orderPath(ALICE)), { status: to });
    if (allowed.has(`${from}->${to}`)) await assertSucceeds(update);
    else await assertFails(update);
  });

  it("walks the full demo lifecycle paid → processing → shipped → delivered", async () => {
    await seedOrder(ALICE);
    const ref = doc(db(ALICE), orderPath(ALICE));
    for (const status of ["processing", "shipped", "delivered"]) {
      await assertSucceeds(updateDoc(ref, { status }));
    }
    await assertFails(updateDoc(ref, { status: "cancelled" }));
  });

  it("does not allow other fields to change alongside the status", async () => {
    await seedOrder(ALICE);
    const ref = doc(db(ALICE), orderPath(ALICE));
    await assertFails(updateDoc(ref, { "amounts.total": 1 }));
    await assertFails(
      updateDoc(ref, { status: "cancelled", customerEmail: "x@example.com" }),
    );
    await assertFails(
      updateDoc(ref, { status: "processing", "customer.address": "Elsewhere" }),
    );
    await assertFails(updateDoc(ref, { refundedAt: serverTimestamp() }));
  });

  it("rejects unknown statuses and no-op writes", async () => {
    await seedOrder(ALICE);
    const ref = doc(db(ALICE), orderPath(ALICE));
    await assertFails(updateDoc(ref, { status: "refunded" }));
    await assertFails(updateDoc(ref, { status: "paid" }));
  });
});

describe("user profile document", () => {
  it("lets the owner write a minimal profile and read it back", async () => {
    const ref = doc(db(ALICE), `users/${ALICE}`);
    await assertSucceeds(
      setDoc(ref, { email: "jamie@example.com", updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(getDoc(ref));
  });

  it("rejects unknown profile fields and other users", async () => {
    await assertFails(
      setDoc(doc(db(ALICE), `users/${ALICE}`), {
        isAdmin: true,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(db(BOB), `users/${ALICE}`), {
        email: "x@example.com",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(getDoc(doc(db(BOB), `users/${ALICE}`)));
  });
});
