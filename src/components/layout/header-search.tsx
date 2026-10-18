import Form from "next/form";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function HeaderSearch({
  id,
  className,
  onSubmit,
}: {
  id: string;
  className?: string;
  onSubmit?: () => void;
}) {
  return (
    <Form
      action="/shop"
      role="search"
      className={cn("relative", className)}
      onSubmit={onSubmit}
    >
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id={id}
        name="q"
        type="search"
        placeholder="Search products"
        autoComplete="off"
        maxLength={80}
        className="h-9 pl-9"
      />
    </Form>
  );
}
