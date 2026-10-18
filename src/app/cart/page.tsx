import type { Metadata } from "next";

import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the items in your Kestrel & Co. demo cart.",
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-semibold sm:text-4xl">Your cart</h1>
      <CartView />
    </div>
  );
}
