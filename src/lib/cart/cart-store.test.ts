import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "kestrel-cart";

type FakeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function memoryStorage(initial: Record<string, string> = {}): FakeStorage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const blockedStorage: FakeStorage = {
  getItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
  removeItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
};

async function loadStore(storage: FakeStorage) {
  vi.stubGlobal("window", {
    localStorage: storage,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  vi.resetModules();
  return import("./cart-store");
}

const stored = (items: unknown) => JSON.stringify({ version: 1, items });

describe("cart store", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("starts empty with no stored cart", async () => {
    const store = await loadStore(memoryStorage());
    expect(store.getCartSnapshot()).toEqual([]);
  });

  it("loads a valid stored cart", async () => {
    const items = [{ productId: "prd_aster_vase", variantId: "sage", quantity: 2 }];
    const store = await loadStore(memoryStorage({ [KEY]: stored(items) }));
    expect(store.getCartSnapshot()).toEqual(items);
  });

  it.each([
    ["invalid JSON", "{not json"],
    ["a wrong version", JSON.stringify({ version: 2, items: [] })],
    [
      "a negative quantity",
      stored([{ productId: "prd_aster_vase", variantId: "sage", quantity: -3 }]),
    ],
    [
      "a huge quantity",
      stored([{ productId: "prd_aster_vase", variantId: "sage", quantity: 1e9 }]),
    ],
    ["a non-array", JSON.stringify({ version: 1, items: "lots" })],
  ])("discards tampered data: %s", async (_label, raw) => {
    const storage = memoryStorage({ [KEY]: raw });
    const store = await loadStore(storage);
    expect(store.getCartSnapshot()).toEqual([]);
    expect(storage.getItem(KEY)).toBeNull();
  });

  it("ignores injected prices: only ids and quantities are kept", async () => {
    const store = await loadStore(
      memoryStorage({
        [KEY]: stored([
          { productId: "prd_aster_vase", variantId: "sage", quantity: 1, price: 1 },
        ]),
      }),
    );
    expect(store.getCartSnapshot()).toEqual([
      { productId: "prd_aster_vase", variantId: "sage", quantity: 1 },
    ]);
  });

  it("drops unknown products and clamps quantities to stock", async () => {
    const store = await loadStore(
      memoryStorage({
        [KEY]: stored([
          { productId: "prd_does_not_exist", variantId: null, quantity: 1 },
          { productId: "prd_halden_lamp", variantId: "cream", quantity: 9 },
        ]),
      }),
    );
    expect(store.getCartSnapshot()).toEqual([
      { productId: "prd_halden_lamp", variantId: "cream", quantity: 3 },
    ]);
  });

  it("persists updates", async () => {
    const storage = memoryStorage();
    const store = await loadStore(storage);
    store.setCartItems(() => [
      { productId: "prd_pourover_set", variantId: null, quantity: 1 },
    ]);
    expect(JSON.parse(storage.getItem(KEY)!)).toEqual({
      version: 1,
      items: [{ productId: "prd_pourover_set", variantId: null, quantity: 1 }],
    });
  });

  it("keeps working in memory when storage is blocked", async () => {
    const store = await loadStore(blockedStorage);
    expect(store.getCartSnapshot()).toEqual([]);
    store.setCartItems(() => [
      { productId: "prd_pourover_set", variantId: null, quantity: 2 },
    ]);
    expect(store.getCartSnapshot()).toEqual([
      { productId: "prd_pourover_set", variantId: null, quantity: 2 },
    ]);
  });
});
