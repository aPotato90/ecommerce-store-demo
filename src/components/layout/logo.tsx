import Link from "next/link";

import { cn } from "@/lib/utils";

export function KestrelMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M7 19c4-1 7-4 9-9 1 3 3 5 9 6-4 1-6 2-8 6-2-3-5-3-10-3z"
        className="fill-primary-foreground"
      />
    </svg>
  );
}

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className="flex items-center gap-2 rounded-md font-heading text-lg font-semibold tracking-tight"
    >
      <KestrelMark />
      <span>
        Kestrel <span className="text-primary">&amp;</span> Co.
      </span>
    </Link>
  );
}
