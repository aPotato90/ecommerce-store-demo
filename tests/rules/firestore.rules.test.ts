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

function validOrder(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        productId: "prd_aster_vase",
        name: "Aster Ceramic Vase",
        unitPrice: 4200,
        quantity: 2,
        variant: "sage",
      },
      {
        productId: "prd_pourover_set",
        name: "Slow Morning Pour-Over Set",
        unitPrice: 5600,
        quantity: 1,
        variant: null,
      },
    ],
    amounts: { subtotal: 14000, shipping: 0, tax: 1050, total: 15050 },
    status: "paid",
    stripeSessionId: "cs_test_a1B2c3D4e5",
    createdAt: serverTimestamp(),
    customerEmail: "jamie@example.com",
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

async function seedOrder(uid: string, id: string, data: Record<string, unknown> = {}) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), `users/${uid}/orders/${id}`), {
      ...validOrder({ createdAt: Timestamp.now() }),
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
    await seedOrder(ALICE, "o1");
    await assertFails(getDoc(doc(db(null), `users/${ALICE}/orders/o1`)));
    await assertFails(setDoc(doc(db(null), `users/${ALICE}/orders/o2`), validOrder()));
  });

  it("denies unknown subcollections even for the owner", async () => {
    await assertFails(setDoc(doc(db(ALICE), `users/${ALICE}/secrets/s1`), { a: 1 }));
    await assertFails(getDoc(doc(db(ALICE), `users/${ALICE}/secrets/s1`)));
  });
});

describe("orders: ownership", () => {
  it("lets the owner create, read and list their orders", async () => {
    const alice = db(ALICE);
    await assertSucceeds(setDoc(doc(alice, `users/${ALICE}/orders/o1`), validOrder()));
    await assertSucceeds(getDoc(doc(alice, `users/${ALICE}/orders/o1`)));
    await assertSucceeds(getDocs(collection(alice, `users/${ALICE}/orders`)));
  });

  it("blocks other users from reading or writing someone else's orders", async () => {
    await seedOrder(ALICE, "o1");
    const bob = db(BOB);
    await assertFails(getDoc(doc(bob, `users/${ALICE}/orders/o1`)));
    await assertFails(getDocs(collection(bob, `users/${ALICE}/orders`)));
    await assertFails(setDoc(doc(bob, `users/${ALICE}/orders/o2`), validOrder()));
    await assertFails(
      updateDoc(doc(bob, `users/${ALICE}/orders/o1`), { status: "cancelled" }),
    );
  });

  it("never allows deleting orders", async () => {
    await seedOrder(ALICE, "o1");
    await assertFails(deleteDoc(doc(db(ALICE), `users/${ALICE}/orders/o1`)));
  });
});

describe("orders: create validation", () => {
  const create = (data: Record<string, unknown>, id = "o1") =>
    setDoc(doc(db(ALICE), `users/${ALICE}/orders/${id}`), data);

  it("accepts processing as an initial status", async () => {
    await assertSucceeds(create(validOrder({ status: "processing" })));
  });

  it.each([
    ["an unknown top-level field", { discount: 100 }],
    ["a fulfilment status", { status: "shipped" }],
    ["an invalid status", { status: "refunded" }],
    ["a live Stripe session", { stripeSessionId: "cs_live_a1B2c3" }],
    ["a malformed session id", { stripeSessionId: "cs_test_<script>" }],
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
      "fractional cents",
      { amounts: { subtotal: 10.5, shipping: 0, tax: 0, total: 10.5 } },
    ],
    ["huge amounts", { amounts: { subtotal: 2e7, shipping: 0, tax: 0, total: 2e7 } }],
    [
      "an extra amount field",
      { amounts: { subtotal: 1, shipping: 0, tax: 0, total: 1, x: 0 } },
    ],
  ])("rejects %s", async (_label, overrides) => {
    await assertFails(create(validOrder(overrides)));
  });

  it.each([
    ["an unknown item field", { ...item(1), sku: "x" }],
    ["a missing variant field", { productId: "p", name: "n", unitPrice: 1, quantity: 1 }],
    ["quantity 0", { ...item(1), quantity: 0 }],
    ["quantity 11", { ...item(1), quantity: 11 }],
    ["a string price", { ...item(1), unitPrice: "100" }],
    ["a negative price", { ...item(1), unitPrice: -1 }],
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
    // Longest allowed values on every line: guards against Firestore's 1000-expression cap.
    const items = Array.from({ length: 6 }, (_, i) => ({
      productId: `prd_${"x".repeat(58)}_${i}`,
      name: "n".repeat(120),
      unitPrice: 100_000,
      quantity: 10,
      variant: "v".repeat(64),
    }));
    await assertSucceeds(
      create(
        validOrder({
          items,
          amounts: { subtotal: 6_000_000, shipping: 0, tax: 0, total: 6_000_000 },
        }),
      ),
    );
  });

  it("rejects missing required fields", async () => {
    const withoutEmail: Record<string, unknown> = validOrder();
    delete withoutEmail.customerEmail;
    await assertFails(create(withoutEmail));
  });

  it("rejects overly long order ids", async () => {
    await assertFails(create(validOrder(), "x".repeat(65)));
  });
});

describe("orders: updates", () => {
  it("lets the owner cancel a paid order", async () => {
    await seedOrder(ALICE, "o1");
    await assertSucceeds(
      updateDoc(doc(db(ALICE), `users/${ALICE}/orders/o1`), { status: "cancelled" }),
    );
  });

  it("does not let the owner mark an order shipped or edit amounts", async () => {
    await seedOrder(ALICE, "o1");
    const ref = doc(db(ALICE), `users/${ALICE}/orders/o1`);
    await assertFails(updateDoc(ref, { status: "shipped" }));
    await assertFails(updateDoc(ref, { "amounts.total": 1 }));
    await assertFails(
      updateDoc(ref, { status: "cancelled", customerEmail: "x@example.com" }),
    );
  });

  it("does not let a shipped order be cancelled", async () => {
    await seedOrder(ALICE, "o1", { status: "shipped" });
    await assertFails(
      updateDoc(doc(db(ALICE), `users/${ALICE}/orders/o1`), { status: "cancelled" }),
    );
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
