"use client";

import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckIcon,
  FastForwardIcon,
  Loader2Icon,
  PackageXIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { OrderLines } from "@/components/checkout/order-lines";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order } from "@/lib/firebase/orders";
import { formatPrice } from "@/lib/format";
import { shortReference } from "@/lib/orders/format";
import {
  canCancel,
  nextStatus,
  STATUS_LABELS,
  type OrderStatus,
} from "@/lib/orders/status";
import { cn } from "@/lib/utils";

import { StatusBadge } from "./status-badge";

const dateFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "long",
  timeStyle: "short",
});
const LIFECYCLE: OrderStatus[] = ["paid", "processing", "shipped", "delivered"];

type LoadState =
  | { kind: "loading" }
  | { kind: "found"; order: Order }
  | { kind: "missing" }
  | { kind: "error"; message: string };

export function OrderDetailView({ orderId }: { orderId: string }) {
  const { status: authStatus, ensureSignedIn, user } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [updating, setUpdating] = useState<OrderStatus | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const confirmRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (authStatus === "unconfigured") return;
    let cancelled = false;
    (async () => {
      const signedIn = await ensureSignedIn();
      if (!signedIn || cancelled) return;
      try {
        const { fetchOrder } = await import("@/lib/firebase/orders");
        const result = await fetchOrder(signedIn.uid, orderId);
        if (cancelled) return;
        setState(
          result.kind === "found"
            ? { kind: "found", order: result.order }
            : result.kind === "missing"
              ? { kind: "missing" }
              : { kind: "error", message: "This order's data couldn't be read." },
        );
      } catch {
        if (!cancelled)
          setState({ kind: "error", message: "We couldn't load this order." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authStatus, ensureSignedIn, orderId]);

  // Reset the transient confirmation when the page is hidden (Activity keeps it mounted).
  useEffect(() => () => setConfirmingCancel(false), []);
  useEffect(() => {
    if (confirmingCancel) confirmRef.current?.focus();
  }, [confirmingCancel]);

  const changeStatus = useCallback(
    async (order: Order, to: OrderStatus) => {
      if (!user) return;
      setUpdating(to);
      try {
        const { updateOrderStatus } = await import("@/lib/firebase/orders");
        await updateOrderStatus(user.uid, order, to);
        setState({ kind: "found", order: { ...order, status: to } });
        setConfirmingCancel(false);
        toast.success(
          to === "cancelled"
            ? "Order cancelled."
            : `Order marked as ${STATUS_LABELS[to]}.`,
        );
      } catch {
        toast.error("That change couldn't be saved. Please try again.");
      } finally {
        setUpdating(null);
      }
    },
    [user],
  );

  if (authStatus === "unconfigured") {
    return (
      <Notice title="Order history isn't connected">
        This deployment has no Firebase project configured, so orders can&apos;t be
        loaded.
      </Notice>
    );
  }
  if (authStatus === "error" || state.kind === "error") {
    return (
      <Notice title="Something went wrong" tone="error">
        {state.kind === "error" ? state.message : "We couldn't start a guest session."}
      </Notice>
    );
  }
  if (state.kind === "loading") {
    return (
      <div aria-busy="true" className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <span className="sr-only">Loading order…</span>
      </div>
    );
  }
  if (state.kind === "missing") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-14 text-center">
        <PackageXIcon aria-hidden="true" className="size-12 text-muted-foreground" />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Order not found</h2>
          <p className="text-muted-foreground">
            There&apos;s no order with this reference in this browser&apos;s guest
            session.
          </p>
        </div>
        <Button asChild>
          <Link href="/orders">View your orders</Link>
        </Button>
      </div>
    );
  }

  const { order } = state;
  const next = nextStatus(order.status);
  const cancellable = canCancel(order.status);
  const busy = updating !== null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">
            Order <span className="font-mono text-xl">{shortReference(order.id)}</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Placed {dateFormat.format(order.createdAt.toDate())}
          </p>
        </div>
        <StatusBadge status={order.status} className="text-sm" />
      </div>

      {order.status === "cancelled" ? (
        <p className="rounded-xl border bg-muted/40 p-4 text-sm">
          This order was cancelled. In a real store the payment would now be refunded; in
          this demo no money moved in the first place.
        </p>
      ) : (
        <ol aria-label="Order progress" className="grid grid-cols-4 gap-2">
          {LIFECYCLE.map((status, index) => {
            const reached = LIFECYCLE.indexOf(order.status) >= index;
            const current = order.status === status;
            return (
              <li
                key={status}
                aria-current={current ? "step" : undefined}
                className="flex flex-col items-center gap-1.5 text-center text-xs sm:text-sm"
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2",
                    reached
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {reached ? (
                    <CheckIcon aria-hidden="true" className="size-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className={current ? "font-semibold" : "text-muted-foreground"}>
                  {STATUS_LABELS[status]}
                  <span className="sr-only">
                    {current ? " (current)" : reached ? " (done)" : " (not yet)"}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section
          aria-labelledby="order-items-heading"
          className="rounded-xl border bg-card p-5"
        >
          <h3 id="order-items-heading" className="mb-2 font-sans text-base font-semibold">
            Items
          </h3>
          <OrderLines
            lines={order.items.map((item, index) => ({
              key: `${item.productId}-${item.variant ?? ""}-${index}`,
              productId: item.productId,
              name: item.name,
              variant: item.variant,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.unitPrice * item.quantity,
            }))}
          />
          <dl className="mt-2 space-y-2 border-t pt-4 text-sm">
            <Amount label="Subtotal" value={order.amounts.subtotal} />
            <Amount
              label="Shipping"
              value={order.amounts.shipping}
              display={order.amounts.shipping === 0 ? "Free" : undefined}
            />
            <Amount label="VAT (7.5%)" value={order.amounts.tax} />
            <Amount label="Total paid" value={order.amounts.total} strong />
          </dl>
        </section>

        <div className="space-y-6">
          <section
            aria-labelledby="order-customer-heading"
            className="rounded-xl border bg-card p-5 text-sm"
          >
            <h3
              id="order-customer-heading"
              className="mb-3 font-sans text-base font-semibold"
            >
              Customer (demo data)
            </h3>
            <dl className="space-y-2">
              <Detail label="Name" value={order.customer.fullName} />
              <Detail label="Email" value={order.customerEmail} />
              <Detail label="Phone" value={order.customer.phone} />
              <Detail label="Delivery address" value={order.customer.address} />
              <Detail label="Payment" value="Paystack (test mode)" />
              <Detail
                label="Paystack reference"
                value={
                  <code className="text-xs break-all">{order.paystackReference}</code>
                }
              />
            </dl>
          </section>

          <section
            aria-labelledby="order-actions-heading"
            className="space-y-4 rounded-xl border bg-card p-5"
          >
            <h3 id="order-actions-heading" className="font-sans text-base font-semibold">
              Manage order
            </h3>

            {cancellable && !confirmingCancel && (
              <Button
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() => setConfirmingCancel(true)}
              >
                <XIcon aria-hidden="true" /> Cancel order
              </Button>
            )}
            {cancellable && confirmingCancel && (
              <div className="space-y-3 rounded-lg border border-destructive/40 p-3">
                <p
                  ref={confirmRef}
                  tabIndex={-1}
                  className="text-sm font-medium focus:outline-none"
                >
                  Cancel this order? This can&apos;t be undone.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void changeStatus(order, "cancelled")}
                  >
                    {updating === "cancelled" && (
                      <Loader2Icon aria-hidden="true" className="animate-spin" />
                    )}
                    Yes, cancel order
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setConfirmingCancel(false)}
                  >
                    Keep order
                  </Button>
                </div>
              </div>
            )}
            {!cancellable && order.status !== "cancelled" && (
              <p className="text-sm text-muted-foreground">
                Orders can only be cancelled before they ship.
              </p>
            )}

            <div className="space-y-2 border-t pt-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Demo only
              </p>
              <Button
                variant="secondary"
                className="w-full"
                disabled={!next || busy}
                aria-describedby="advance-status-help"
                onClick={() => next && void changeStatus(order, next)}
              >
                {updating && updating !== "cancelled" ? (
                  <Loader2Icon aria-hidden="true" className="animate-spin" />
                ) : (
                  <FastForwardIcon aria-hidden="true" />
                )}
                Advance status
              </Button>
              <p id="advance-status-help" className="text-xs text-muted-foreground">
                {next
                  ? `Simulates fulfilment: moves this order to "${STATUS_LABELS[next]}".`
                  : "This order has reached the end of its lifecycle."}
              </p>
            </div>
          </section>
        </div>
      </div>

      <Link
        href="/orders"
        className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" /> All orders
      </Link>
    </div>
  );
}

function Amount({
  label,
  value,
  display,
  strong,
}: {
  label: string;
  value: number;
  display?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between",
        strong && "border-t pt-2 text-base font-semibold",
      )}
    >
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{display ?? formatPrice(value)}</dd>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
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
