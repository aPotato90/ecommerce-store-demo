"use client";

import { MinusIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuantityStepperProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  /** Used in button labels, e.g. "Decrease quantity of Aster Ceramic Vase". */
  itemName: string;
  size?: "sm" | "md";
  className?: string;
};

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  itemName,
  size = "md",
  className,
}: QuantityStepperProps) {
  const buttonSize = size === "sm" ? "icon-sm" : "icon-lg";
  return (
    <div
      role="group"
      aria-label={`Quantity of ${itemName}`}
      className={cn(
        "inline-flex items-center rounded-lg border bg-background",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size={buttonSize}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Decrease quantity of ${itemName}`}
      >
        <MinusIcon aria-hidden="true" />
      </Button>
      <output
        aria-live="polite"
        className={cn(
          "min-w-8 text-center font-medium tabular-nums",
          size === "sm" ? "text-sm" : "text-base",
        )}
      >
        <span className="sr-only">Quantity: </span>
        {value}
      </output>
      <Button
        type="button"
        variant="ghost"
        size={buttonSize}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Increase quantity of ${itemName}`}
      >
        <PlusIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
