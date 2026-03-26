"use client";

import { Minus, Plus } from "lucide-react";
import { useCallback, useRef } from "react";

import { cn } from "@/lib/general/utils";

interface QuantityStepperProps {
  quantity: number;
  onIncrement: (e: React.MouseEvent) => void;
  onDecrement: (e: React.MouseEvent) => void;
  /** Called when "+" is clicked in collapsed state (quantity=0). Only used by overlay variant. */
  onAdd?: (e: React.MouseEvent) => void;
  /** "overlay" = on images, "inline" = bordered in lists, "detail" = large in product sheet */
  variant?: "overlay" | "inline" | "detail";
  className?: string;
}

export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  onAdd,
  variant = "inline",
  className,
}: QuantityStepperProps) {
  const plusRef = useRef<HTMLButtonElement>(null);

  const shake = useCallback(() => {
    const el = plusRef.current;
    if (!el) return;
    el.classList.remove("animate-shake");
    // Force reflow so re-adding the class restarts the animation
    void el.offsetWidth;
    el.classList.add("animate-shake");
  }, []);

  if (variant === "overlay") {
    const isCollapsed = quantity === 0;

    return (
      <div
        className={cn(
          "flex items-center bg-background/90 backdrop-blur-sm rounded-lg overflow-hidden border border-border shadow-md transition-all duration-300",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Collapsible left section: minus button + quantity */}
        <div
          className="flex items-center overflow-hidden transition-all duration-300"
          style={{ width: isCollapsed ? 0 : "3.5rem" }}
        >
          <button
            className="size-8 flex items-center justify-center hover:bg-muted transition-colors duration-200 cursor-pointer shrink-0"
            style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
            onClick={onDecrement}
            tabIndex={isCollapsed ? -1 : 0}
          >
            <Minus className="size-3.5" />
          </button>
          <span className="text-sm font-bold text-foreground tabular-nums w-6 text-center shrink-0">
            {quantity}
          </span>
        </div>

        {/* Plus button — always visible */}
        <button
          ref={plusRef}
          className="size-8 flex items-center justify-center hover:bg-muted transition-colors duration-200 cursor-pointer shrink-0"
          style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
          onClick={(e) => {
            shake();
            (isCollapsed ? (onAdd ?? onIncrement) : onIncrement)(e);
          }}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div
        className={cn(
          "flex items-center bg-muted rounded-xl overflow-hidden h-11",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="size-11 flex items-center justify-center hover:bg-muted/80 transition-colors duration-200 cursor-pointer"
          style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
          onClick={onDecrement}
        >
          <Minus className="size-5" />
        </button>
        <span className="text-base font-bold w-8 text-center tabular-nums text-foreground">
          {quantity}
        </span>
        <button
          className="size-11 flex items-center justify-center hover:bg-muted/80 transition-colors duration-200 cursor-pointer"
          style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
          onClick={onIncrement}
        >
          <Plus className="size-5" />
        </button>
      </div>
    );
  }

  // Inline variant
  return (
    <div
      className={cn(
        "flex items-center bg-background/80 backdrop-blur-sm rounded-lg overflow-hidden border border-border",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="size-8 flex items-center justify-center hover:bg-muted transition-colors duration-200 cursor-pointer"
        style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
        onClick={onDecrement}
      >
        <Minus className="size-3.5" />
      </button>
      <span className="text-sm font-bold text-foreground tabular-nums w-6 text-center">
        {quantity}
      </span>
      <button
        className="size-8 flex items-center justify-center hover:bg-muted transition-colors duration-200 cursor-pointer"
        style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
        onClick={onIncrement}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
