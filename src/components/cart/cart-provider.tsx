"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";

import {
  getCartSnapshot,
  getServerCartSnapshot,
  setCartItems,
  subscribeCart,
} from "@/lib/cart/cart-store";
import { pluralize } from "@/lib/format";
import {
  cartLineKey,
  maxQuantityFor,
  resolveCartItems,
  type ResolvedCartLine,
} from "@/lib/shop/catalogue";
import { priceCart, type CartTotals } from "@/lib/shop/pricing";
import { MAX_CART_LINES, type CartItem } from "@/lib/shop/schemas";
import type { Product } from "@/lib/shop/types";

type CartContextValue = {
  lines: ResolvedCartLine[];
  totals: CartTotals<ResolvedCartLine>;
  /** False until the cart has been read from storage on the client. */
  hydrated: boolean;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  addItem: (product: Product, variantId: string | null, quantity: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const noopSubscribe = () => () => {};

function describe(product: Product, variantLabel?: string) {
  return variantLabel ? `${product.name} (${variantLabel})` : product.name;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(
    subscribeCart,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [isOpen, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const lines = useMemo(() => resolveCartItems(items), [items]);
  const totals = useMemo(() => priceCart(lines), [lines]);

  // Announce cart count changes to screen readers (but not the initial load).
  const previousCount = useRef<number | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (previousCount.current !== null && previousCount.current !== totals.itemCount) {
      setAnnouncement(`Cart updated: ${pluralize(totals.itemCount, "item")}.`);
    }
    previousCount.current = totals.itemCount;
  }, [hydrated, totals.itemCount]);

  const addItem = useCallback(
    (product: Product, variantId: string | null, quantity: number) => {
      const max = maxQuantityFor(product);
      const key = cartLineKey(product.id, variantId);
      const current = getCartSnapshot().find(
        (item) => cartLineKey(item.productId, item.variantId) === key,
      );
      const currentQuantity = current?.quantity ?? 0;
      const addable = Math.max(0, Math.min(quantity, max - currentQuantity));
      const variantLabel = product.variants?.options.find(
        (o) => o.id === variantId,
      )?.label;
      const name = describe(product, variantLabel);

      if (addable === 0) {
        toast.warning(
          max === 0
            ? `${product.name} is sold out.`
            : `You already have the maximum of ${max} ${name} in your cart.`,
        );
        return;
      }

      if (!current && getCartSnapshot().length >= MAX_CART_LINES) {
        toast.warning(
          `Your cart can hold up to ${MAX_CART_LINES} different items. Remove one to add another.`,
        );
        return;
      }

      setCartItems((cart) =>
        current
          ? cart.map((item) =>
              cartLineKey(item.productId, item.variantId) === key
                ? { ...item, quantity: item.quantity + addable }
                : item,
            )
          : [...cart, { productId: product.id, variantId, quantity: addable }],
      );

      toast.success(`Added ${addable} × ${name} to your cart.`, {
        description:
          addable < quantity
            ? `Only ${max} available, so we added what we could.`
            : undefined,
        action: { label: "View cart", onClick: () => setOpen(true) },
      });
    },
    [],
  );

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setCartItems((cart) =>
      cart.map((item) =>
        cartLineKey(item.productId, item.variantId) === key
          ? { ...item, quantity: Math.max(1, Math.round(quantity)) }
          : item,
      ),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    const cart = getCartSnapshot();
    const index = cart.findIndex(
      (item) => cartLineKey(item.productId, item.variantId) === key,
    );
    if (index === -1) return;
    const removed: CartItem = cart[index];
    const line = resolveCartItems([removed])[0];

    setCartItems((current) => current.filter((_, i) => i !== index));

    toast(`Removed ${line ? describe(line.product, line.variant?.label) : "item"}.`, {
      action: {
        label: "Undo",
        onClick: () =>
          setCartItems((current) => {
            const existing = current.find(
              (item) => cartLineKey(item.productId, item.variantId) === key,
            );
            if (existing) {
              return current.map((item) =>
                item === existing
                  ? { ...item, quantity: item.quantity + removed.quantity }
                  : item,
              );
            }
            const next = [...current];
            next.splice(Math.min(index, next.length), 0, removed);
            return next;
          }),
      },
    });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      totals,
      hydrated,
      isOpen,
      setOpen,
      addItem,
      updateQuantity,
      removeItem,
    }),
    [lines, totals, hydrated, isOpen, addItem, updateQuantity, removeItem],
  );

  return (
    <CartContext value={value}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </CartContext>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
