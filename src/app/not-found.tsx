import Link from "next/link";
import { CompassIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-24 text-center">
      <CompassIcon aria-hidden="true" className="size-12 text-primary" />
      <h1 className="text-3xl font-semibold sm:text-4xl">
        We couldn&apos;t find that page
      </h1>
      <p className="text-muted-foreground">
        The product or page you&apos;re looking for doesn&apos;t exist in this demo store.
        It may have been renamed, or the link might be mistyped.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/shop">Browse the shop</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
