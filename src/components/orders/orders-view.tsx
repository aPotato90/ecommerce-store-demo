"use client";

import Link from "next/link";
import { PackageIcon, TriangleAlertIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order } from "@/lib/firebase/orders";
import { formatPrice, pluralize } from "@/lib/format";

const STATUS_LABELS: Record<Order["status"], string> = {
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; orders: Order[] }
  | { kind: "error"; message: string };

export function OrdersView() {
  const { status, ensureSignedIn, error } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    if (status === "unconfigured") return;
    let cancelled = false;
    (async () => {
      const user = await ensureSignedIn();
      if (!user || cancelled) return;
      try {
        const { fetchOrders } = await import("@/lib/firebase/orders");
        const orders = await fetchOrders(user.uid);
        if (!cancelled) setState({ kind: "ready", orders });
      } catch {
        if (!cancelled)
          setState({ kind: "error", message: "We couldn't load your orders." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, ensureSignedIn]);

  if (status === "unconfigured") {
    return (
      <Notice title="Order history isn't connected">
        This deployment has no Firebase project configured, so guest sessions and order
        history are switched off. Add the <code>NEXT_PUBLIC_FIREBASE_*</code> variables to
        enable them.
      </Notice>
    );
  }

  if (status === "error" || state.kind === "error") {
    return (
      <Notice title="Something went wrong" tone="error">
        {state.kind === "error"
          ? state.message
          : (error ?? "Could not start a guest session.")}
      </Notice>
    );
  }

  if (state.kind === "loading") {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <span className="sr-only">Loading your orders…</span>
      </div>
    );
  }

  if (state.orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-14 text-center">
        <PackageIcon aria-hidden="true" className="size-12 text-muted-foreground" />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">No orders yet</h2>
          <p className="text-muted-foreground">
            Orders you place with a Stripe test card will appear here.
          </p>
        </div>
        <Button asChild>
          <Link href="/shop">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {state.orders.map((order) => (
        <li key={order.id} className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-sans text-base font-semibold">
              Order <span className="font-mono text-sm">{order.id.slice(0, 8)}</span>
            </h2>
            <Badge variant={order.status === "cancelled" ? "secondary" : "default"}>
              {STATUS_LABELS[order.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateFormat.format(order.createdAt.toDate())} ·{" "}
            {pluralize(
              order.items.reduce((sum, item) => sum + item.quantity, 0),
              "item",
            )}{" "}
            · {formatPrice(order.amounts.total)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Notice({
  title,
  tone = "info",
  children,
}: {
  title: string;
  tone?: "info" | "error";
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className="flex gap-3 rounded-xl border bg-card p-4"
    >
      <TriangleAlertIcon
        aria-hidden="true"
        className={tone === "error" ? "size-5 text-destructive" : "size-5 text-primary"}
      />
      <div className="space-y-1">
        <h2 className="font-sans text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
