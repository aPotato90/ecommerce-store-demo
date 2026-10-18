"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2Icon, LockIcon, ShoppingBagIcon, TriangleAlertIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { initializeCheckout } from "@/app/checkout/actions";
import { useAuth } from "@/components/auth/auth-provider";
import { useCart } from "@/components/cart/cart-provider";
import { CartSummary } from "@/components/cart/cart-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  customerSchema,
  NIGERIAN_STATES,
  type Customer,
  type CustomerInput,
} from "@/lib/checkout/schemas";
import { cn } from "@/lib/utils";

import { fieldAria, FormField } from "./form-field";
import { OrderLines } from "./order-lines";
import { TestModeNotice } from "./test-mode-notice";

const EMPTY_CUSTOMER: CustomerInput = {
  email: "",
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "" as CustomerInput["state"],
};

const selectClassName =
  "h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30";

export function CheckoutView() {
  const { lines, totals, hydrated } = useCart();
  const { status: authStatus, ensureSignedIn } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [redirecting, setRedirecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Checkout is one of the places an identity is needed: sign in anonymously now, so the
  // order can be saved to this browser's history after Paystack sends the visitor back.
  useEffect(() => {
    if (hydrated && lines.length > 0 && authStatus === "idle") void ensureSignedIn();
  }, [hydrated, lines.length, authStatus, ensureSignedIn]);

  const form = useForm<CustomerInput, unknown, Customer>({
    resolver: zodResolver(customerSchema),
    defaultValues: EMPTY_CUSTOMER,
    mode: "onTouched",
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (formError) errorRef.current?.focus();
  }, [formError]);

  const onSubmit = form.handleSubmit((customer) => {
    setFormError(null);
    startTransition(async () => {
      const result = await initializeCheckout({
        // Only ids, variants and quantities: the server prices everything itself.
        items: lines.map((line) => ({
          productId: line.product.id,
          variantId: line.variant?.id ?? null,
          quantity: line.quantity,
        })),
        customer,
      });
      if (result.ok) {
        setRedirecting(true);
        window.location.assign(result.authorizationUrl);
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as keyof CustomerInput, { message });
      }
      setFormError(result.message);
    });
  });

  if (!hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]" aria-busy="true">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-72 w-full" />
        <span className="sr-only">Loading checkout…</span>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
        <ShoppingBagIcon aria-hidden="true" className="size-12 text-muted-foreground" />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Your cart is empty</h2>
          <p className="text-muted-foreground">
            Add something to your cart to check out.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  const busy = isPending || redirecting;
  const field = (name: keyof CustomerInput, hint?: string) => ({
    ...fieldAria(`checkout-${name}`, errors[name]?.message, hint),
    ...form.register(name),
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
      <form
        noValidate
        onSubmit={onSubmit}
        className="space-y-8"
        aria-describedby="demo-data-note"
      >
        <TestModeNotice />

        <p id="demo-data-note" className="text-sm text-muted-foreground">
          This is a demo: please enter{" "}
          <strong className="text-foreground">fake details</strong> (an{" "}
          <code>example.com</code> email and a made-up address are perfect). They&apos;re
          only used to show how a real checkout works.
        </p>

        {formError && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="flex gap-3 rounded-xl border border-destructive/50 bg-destructive/5 p-4 text-sm focus:outline-none"
          >
            <TriangleAlertIcon
              aria-hidden="true"
              className="size-5 shrink-0 text-destructive"
            />
            <div className="space-y-1">
              <p className="font-semibold">We couldn&apos;t start the payment</p>
              <p>{formError}</p>
            </div>
          </div>
        )}

        <fieldset className="space-y-4">
          <legend className="mb-4 font-heading text-xl font-semibold">
            Contact details{" "}
            <span className="font-sans text-sm font-normal text-muted-foreground">
              (fake demo data)
            </span>
          </legend>
          <FormField
            id="checkout-email"
            label="Email"
            hint="Use an example.com address. Paystack shows it on the test receipt."
            error={errors.email?.message}
          >
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-10"
              {...field(
                "email",
                "Use an example.com address. Paystack shows it on the test receipt.",
              )}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="checkout-fullName"
              label="Full name"
              error={errors.fullName?.message}
            >
              <Input
                autoComplete="name"
                placeholder="Ada Demo"
                className="h-10"
                {...field("fullName")}
              />
            </FormField>
            <FormField
              id="checkout-phone"
              label="Phone"
              hint="Nigerian mobile format, e.g. 0803 000 0000."
              error={errors.phone?.message}
            >
              <Input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="0803 000 0000"
                className="h-10"
                {...field("phone", "Nigerian mobile format, e.g. 0803 000 0000.")}
              />
            </FormField>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-4 font-heading text-xl font-semibold">
            Delivery address{" "}
            <span className="font-sans text-sm font-normal text-muted-foreground">
              (fake demo data)
            </span>
          </legend>
          <FormField
            id="checkout-addressLine1"
            label="Street address"
            error={errors.addressLine1?.message}
          >
            <Input
              autoComplete="address-line1"
              placeholder="1 Example Close"
              className="h-10"
              {...field("addressLine1")}
            />
          </FormField>
          <FormField
            id="checkout-addressLine2"
            label="Apartment, suite, landmark"
            optional
            error={errors.addressLine2?.message}
          >
            <Input
              autoComplete="address-line2"
              className="h-10"
              {...field("addressLine2")}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="checkout-city"
              label="City or town"
              error={errors.city?.message}
            >
              <Input
                autoComplete="address-level2"
                placeholder="Ikeja"
                className="h-10"
                {...field("city")}
              />
            </FormField>
            <FormField id="checkout-state" label="State" error={errors.state?.message}>
              <select
                autoComplete="address-level1"
                className={cn(selectClassName, "cursor-pointer")}
                {...field("state")}
              >
                <option value="">Choose a state</option>
                {NIGERIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </fieldset>

        <div className="space-y-3">
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full text-base"
            disabled={busy}
          >
            {busy ? (
              <Loader2Icon aria-hidden="true" className="animate-spin" />
            ) : (
              <LockIcon aria-hidden="true" />
            )}
            {redirecting
              ? "Redirecting to Paystack…"
              : isPending
                ? "Starting payment…"
                : "Pay with Paystack (test mode)"}
          </Button>
          <p className="text-center text-xs text-muted-foreground" aria-live="polite">
            {authStatus === "unconfigured"
              ? "Order history isn't connected on this deployment, but your test payment will still be verified."
              : "Prices are re-checked on the server before you pay."}
          </p>
        </div>
      </form>

      <section
        aria-labelledby="checkout-summary-heading"
        className="space-y-4 rounded-xl border bg-card p-5 lg:sticky lg:top-24"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="checkout-summary-heading" className="text-xl font-semibold">
            Order summary
          </h2>
          <Link
            href="/cart"
            className="rounded-sm text-sm font-medium text-primary hover:underline"
          >
            Edit cart
          </Link>
        </div>
        <OrderLines
          lines={totals.lines.map((line) => ({
            key: line.key,
            productId: line.product.id,
            name: line.product.name,
            variant: line.variant?.id ?? null,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          }))}
        />
        <CartSummary totals={totals} className="border-t pt-4" />
      </section>
    </div>
  );
}
