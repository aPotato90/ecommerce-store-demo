import { StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type RatingProps = {
  rating: number;
  reviewCount?: number;
  className?: string;
  size?: "sm" | "md";
};

export function Rating({ rating, reviewCount, className, size = "sm" }: RatingProps) {
  const label = `Rated ${rating.toFixed(1)} out of 5${
    reviewCount !== undefined ? `, ${reviewCount} reviews` : ""
  }`;
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span role="img" aria-label={label} className="flex items-center">
        {Array.from({ length: 5 }, (_, i) => {
          const fill = Math.max(0, Math.min(1, rating - i));
          return (
            <span key={i} className="relative inline-block" aria-hidden="true">
              <StarIcon
                className={cn(
                  "text-muted-foreground/40",
                  size === "sm" ? "size-3.5" : "size-4.5",
                )}
              />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <StarIcon
                  className={cn(
                    "fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400",
                    size === "sm" ? "size-3.5" : "size-4.5",
                  )}
                />
              </span>
            </span>
          );
        })}
      </span>
      <span
        aria-hidden="true"
        className={cn("text-muted-foreground", size === "sm" ? "text-xs" : "text-sm")}
      >
        {rating.toFixed(1)}
        {reviewCount !== undefined && ` (${reviewCount})`}
      </span>
    </div>
  );
}
