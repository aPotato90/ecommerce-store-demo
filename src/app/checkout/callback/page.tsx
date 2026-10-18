import type { Metadata } from "next";
import { Suspense } from "react";

import { CallbackView } from "@/components/checkout/callback-view";
import { Skeleton } from "@/components/ui/skeleton";

// Verification and saving happen in the browser after Paystack redirects here, behind the
// on-demand anonymous auth gate, so navigations into this page are not expected to be instant.
export const instant = false;

export const metadata: Metadata = {
  title: "Confirming your payment",
  description: "Verifying your Paystack test-mode payment.",
};

export default function CheckoutCallbackPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-semibold sm:text-4xl">Payment</h1>
      <Suspense
        fallback={
          <div aria-busy="true" className="space-y-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        }
      >
        <CallbackView />
      </Suspense>
    </div>
  );
}
