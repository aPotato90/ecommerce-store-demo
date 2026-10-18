import Link from "next/link";
import { LockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CheckoutButton() {
  return (
    <div className="space-y-2">
      <Button asChild size="lg" className="h-11 w-full text-base">
        <Link href="/checkout">
          <LockIcon aria-hidden="true" />
          Checkout
        </Link>
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Pay with Paystack in test mode. No real money moves.
      </p>
    </div>
  );
}
