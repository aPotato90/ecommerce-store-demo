import { LockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Paystack checkout is the next milestone; until then the button is disabled. */
export function CheckoutButton() {
  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="lg"
        className="h-11 w-full text-base"
        disabled
        aria-describedby="checkout-coming-next"
      >
        <LockIcon aria-hidden="true" />
        Checkout
      </Button>
      <p id="checkout-coming-next" className="text-center text-xs text-muted-foreground">
        Checkout coming next: Paystack test-mode payments.
      </p>
    </div>
  );
}
