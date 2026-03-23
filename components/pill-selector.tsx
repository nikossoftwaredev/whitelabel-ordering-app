"use client";

import { cn } from "@/lib/utils";

interface PillOption<T extends string> {
  key: T;
  label: string;
  icon?: React.ReactNode;
}

interface PillSelectorProps<T extends string> {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** If true, clicking the active pill deselects it (sets to "" ) */
  deselectable?: boolean;
  className?: string;
  pillClassName?: string;
}

export function PillSelector<T extends string>({
  options,
  value,
  onChange,
  deselectable = false,
  className,
  pillClassName,
}: PillSelectorProps<T>) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map(({ key, label, icon }) => {
        const isActive = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() =>
              onChange(deselectable && isActive ? ("" as T) : key)
            }
            className={cn(
              "h-10 px-3.5 rounded-xl text-[13px] font-medium flex items-center justify-center gap-1.5 border transition-all duration-200 cursor-pointer",
              isActive
                ? "border-transparent text-white bg-[var(--brand-primary,hsl(var(--primary)))]"
                : "border-border text-muted-foreground hover:border-foreground/30",
              pillClassName
            )}
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}
