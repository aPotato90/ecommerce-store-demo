import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderDetailView } from "@/components/orders/order-detail-view";
import { Skeleton } from "@/components/ui/skeleton";

// Orders are read from Firestore in the browser behind the on-demand anonymous auth gate, so
// navigations into this page are not expected to be instant (see the Next 16 `instant` docs).
export const instant = false;

export const metadata: Metadata = {
  title: "Order details",
  description: "A demo order paid with Paystack in test mode.",
};

async function OrderDetail({ params }: { params: PageProps<"/orders/[id]">["params"] }) {
  const { id } = await params;
  return <OrderDetailView orderId={decodeURIComponent(id)} />;
}

export default function OrderPage({ params }: PageProps<"/orders/[id]">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-semibold sm:text-4xl">Order details</h1>
      <Suspense
        fallback={
          <div aria-busy="true" className="space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        }
      >
        <OrderDetail params={params} />
      </Suspense>
    </div>
  );
}
