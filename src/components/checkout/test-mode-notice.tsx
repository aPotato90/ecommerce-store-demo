import { FlaskConicalIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Prominent reminder that payments are Paystack test-mode only. */
export function TestModeNotice({ className }: { className?: string }) {
  return (
    <aside
      aria-label="Test mode"
      className={cn(
        "flex gap-3 rounded-xl border-2 border-dashed border-primary/60 bg-primary/5 p-4",
        className,
      )}
    >
      <FlaskConicalIcon
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-primary"
      />
      <div className="space-y-1 text-sm">
        <p className="font-semibold">Test mode: no real money</p>
        <p className="text-muted-foreground">
          You&apos;ll be sent to Paystack&apos;s test checkout. Pay with a{" "}
          <a
            href="https://paystack.com/docs/payments/test-payments/"
            target="_blank"
            rel="noreferrer"
            className="rounded-sm font-medium text-foreground underline underline-offset-4"
          >
            Paystack test card
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          , never a real one. Nothing is charged and nothing ships.
        </p>
      </div>
    </aside>
  );
}
