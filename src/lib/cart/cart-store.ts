import { cartLineKey, resolveCartItems } from "@/lib/shop/catalogue";
import { MAX_CART_LINES, storedCartSchema, type CartItem } from "@/lib/shop/schemas";

export const CART_STORAGE_KEY = "kestrel-cart";

const EMPTY: CartItem[] = [];

let items: CartItem[] | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Re-validates items against the catalogue: drops unknown lines, clamps to stock. */
function sanitize(input: readonly CartItem[]): CartItem[] {
  return resolveCartItems(input)
    .slice(0, MAX_CART_LINES)
    .map((line) => ({
      productId: line.product.id,
      variantId: line.variant?.id ?? null,
      quantity: line.quantity,
    }));
}

/**
 * Reads the cart from localStorage. Anything that fails JSON parsing or schema validation
 * (tampered, outdated or truncated data) is discarded rather than crashing the app.
 */
function readStorage(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed = storedCartSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return sanitize(parsed.data.items);
  } catch {
    // Invalid JSON: fall through.
  }
  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Storage unavailable.
  }
  return [];
}

function writeStorage(next: CartItem[]) {
  try {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ version: 1, items: next }),
    );
  } catch {
    // Storage blocked or full: the cart still works in memory for this session.
  }
}

export function getCartSnapshot(): CartItem[] {
  if (items === null) items = readStorage();
  return items;
}

export function getServerCartSnapshot(): CartItem[] {
  return EMPTY;
}

/** Keeps carts in sync across tabs. */
function onStorage(event: StorageEvent) {
  if (event.key === CART_STORAGE_KEY || event.key === null) {
    items = readStorage();
    emit();
  }
}

export function subscribeCart(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function setCartItems(updater: (current: CartItem[]) => CartItem[]) {
  const next = sanitize(updater(getCartSnapshot()));
  items = next;
  writeStorage(next);
  emit();
}

export { cartLineKey };
