"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleCheckIcon, CircleXIcon, Loader2Icon, RotateCcwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { verifyCheckout } from "@/app/checkout/actions";
import { useAuth } from "@/components/auth/auth-provider";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import type { VerifiedOrder, VerifyFailureCode } from "@/lib/checkout/service";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { formatPrice } from "@/lib/format";

type Outcome =
  | { kind: "saved"; reference: string }
  | { kind: "already_saved"; reference: string }
  | { kind: "verified_not_saved"; order: VerifiedOrder }
  | {
      kind: "error";
      code: VerifyFailureCode | "missing_reference" | "auth_failed" | "save_failed";
      message: string;
    };

type Step = "verifying" | "saving";

// One verification + save per reference, shared across re-renders, Strict Mode double effects
// and Activity re-mounts. A retry clears the entry.
const inFlight = new Map<string, Promise<Outcome>>();

async function processPayment(
  reference: string,
  ensureSignedIn: () => Promise<{ uid: string } | null>,
  onStep: (step: Step) => void,
): Promise<Outcome> {
  let verified;
  try {
    verified = await verifyCheckout(reference);
  } catch {
    return {
      kind: "error",
      code: "network_error",
      message:
        "We couldn't reach the server to verify your payment. Check your connection.",
    };
  }
  if (!verified.ok)
    return { kind: "error", code: verified.code, message: verified.message };

  if (!isFirebaseConfigured) return { kind: "verified_not_saved", order: verified.order };

  onStep("saving");
  const user = await ensureSignedIn();
  if (!user) {
    return {
      kind: "error",
      code: "auth_failed",
      message:
        "Your payment is verified, but we couldn't start a guest session to save it.",
    };
  }
  try {
    const { saveVerifiedOrder } = await import("@/lib/firebase/orders");
    const result = await saveVerifiedOrder(user.uid, verified.order);
    return { kind: result, reference };
  } catch {
    return {
      kind: "error",
      code: "save_failed",
      message: "Your payment is verified, but saving the order failed. Please try again.",
    };
  }
}

const RETRYABLE = new Set<string>([
  "network_error",
  "paystack_error",
  "payment_pending",
  "auth_failed",
  "save_failed",
  "config_error",
]);
const PAYMENT_NOT_TAKEN = new Set<string>(["payment_abandoned", "payment_failed"]);

export function CallbackView() {
  const searchParams = useSearchParams();
  // Paystack appends both ?trxref= and ?reference= to the callback URL.
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  const router = useRouter();
  const { ensureSignedIn } = useAuth();
  const { clearCart } = useCart();
  const [step, setStep] = useState<Step>("verifying");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!reference) return;
    let active = true;
    let promise = inFlight.get(reference);
    if (!promise) {
      promise = processPayment(
        reference,
        ensureSignedIn,
        (next) => active && setStep(next),
      );
      inFlight.set(reference, promise);
    }
    promise.then((result) => {
      if (!active) return;
      // Only a fresh save empties the cart: revisiting an old callback link must not wipe a
      // cart the visitor has filled since.
      if (result.kind === "saved" || result.kind === "verified_not_saved") clearCart();
      if (result.kind === "saved") {
        router.replace(`/orders/${result.reference}`);
        return;
      }
      setOutcome(result);
    });
    return () => {
      active = false;
    };
  }, [reference, attempt, ensureSignedIn, clearCart, router]);

  const retry = useCallback(() => {
    if (reference) inFlight.delete(reference);
    setOutcome(null);
    setStep("verifying");
    setAttempt((n) => n + 1);
  }, [reference]);

  const current: Outcome | null = !reference
    ? {
        kind: "error",
        code: "missing_reference",
        message: "This page needs a payment reference from Paystack, but none was found.",
      }
    : outcome;

  if (!current || current.kind === "saved") {
    return (
      <div role="status" className="flex flex-col items-center gap-4 py-16 text-center">
        <Loader2Icon aria-hidden="true" className="size-10 animate-spin text-primary" />
        <p className="text-lg font-medium">
          {step === "verifying"
            ? "Verifying your payment with Paystack…"
            : "Saving your order…"}
        </p>
        <p className="text-sm text-muted-foreground">This only takes a moment.</p>
      </div>
    );
  }

  if (current.kind === "already_saved") {
    return (
      <Panel tone="success" title="This order is already saved">
        <p>
          We&apos;ve already recorded the payment with reference{" "}
          <code className="break-all">{current.reference}</code>, so nothing was saved
          twice.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={`/orders/${current.reference}`}>View order</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/orders">All orders</Link>
          </Button>
        </div>
      </Panel>
    );
  }

  if (current.kind === "verified_not_saved") {
    return (
      <Panel tone="success" title="Payment verified">
        <p>
          Paystack confirmed your test payment of{" "}
          <strong>{formatPrice(current.order.amounts.total)}</strong> (reference{" "}
          <code className="break-all">{current.order.reference}</code>). Order history
          isn&apos;t connected on this deployment, so the order wasn&apos;t saved.
        </p>
        <Button asChild>
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </Panel>
    );
  }

  const notTaken = PAYMENT_NOT_TAKEN.has(current.code);
  const title = notTaken
    ? current.code === "payment_abandoned"
      ? "Payment not completed"
      : "Payment failed"
    : current.code === "amount_mismatch" ||
        current.code === "currency_mismatch" ||
        current.code === "reference_mismatch" ||
        current.code === "invalid_metadata"
      ? "We couldn't verify this payment"
      : current.code === "network_error"
        ? "Network problem"
        : current.code === "save_failed" || current.code === "auth_failed"
          ? "Order not saved yet"
          : "Something went wrong";

  return (
    <Panel tone="error" title={title}>
      <p>{current.message}</p>
      {notTaken && (
        <p>Your cart is still here, so you can try again whenever you like.</p>
      )}
      {reference && (
        <p className="text-sm text-muted-foreground">
          Reference: <code className="break-all">{reference}</code>
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {RETRYABLE.has(current.code) && (
          <Button size="lg" onClick={retry}>
            <RotateCcwIcon aria-hidden="true" /> Try again
          </Button>
        )}
        <Button
          asChild
          size="lg"
          variant={RETRYABLE.has(current.code) ? "outline" : "default"}
        >
          <Link href="/checkout">{notTaken ? "Try again" : "Back to checkout"}</Link>
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link href="/cart">View cart</Link>
        </Button>
      </div>
    </Panel>
  );
}

function Panel({
  tone,
  title,
  children,
}: {
  tone: "success" | "error";
  title: string;
  children: React.ReactNode;
}) {
  const Icon = tone === "success" ? CircleCheckIcon : CircleXIcon;
  return (
    <section
      role={tone === "error" ? "alert" : "status"}
      className="mx-auto flex max-w-2xl flex-col items-start gap-4 rounded-xl border bg-card p-6"
    >
      <Icon
        aria-hidden="true"
        className={
          tone === "success" ? "size-10 text-success" : "size-10 text-destructive"
        }
      />
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="space-y-4 text-muted-foreground [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}
