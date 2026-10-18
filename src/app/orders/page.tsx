import type { Metadata } from "next";

import { OrdersView } from "@/components/orders/orders-view";

// The order list sits behind a client-side (anonymous) auth gate, so navigations into this
// page are not expected to render instantly. See AGENTS.md / the Next 16 `instant` docs.
export const instant = false;

export const metadata: Metadata = {
  title: "Your orders",
  description: "Orders placed in this browser on the Kestrel & Co. demo store.",
};

export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-3xl font-semibold sm:text-4xl">Your orders</h1>
      <p className="mb-8 text-muted-foreground">
        Orders are tied to an anonymous guest session in this browser. Everything here is
        test data: no real orders are ever placed.
      </p>
      <OrdersView />
    </div>
  );
}
