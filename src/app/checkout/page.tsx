import type { Metadata } from "next";

import { CheckoutView } from "@/components/checkout/checkout-view";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Pay for your Kestrel & Co. demo order with Paystack in test mode.",
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-semibold sm:text-4xl">Checkout</h1>
      <CheckoutView />
    </div>
  );
}
