import { Flame, Percent, Tag } from "lucide-react";

import { cn } from "@/lib/general/utils";

type BadgeVariant = "popular" | "offer" | "discount";

interface ProductBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const config: Record<
  BadgeVariant,
  { icon: React.ElementType; bg: string; text: string }
> = {
  popular: {
    icon: Flame,
    bg: "bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
  },
  offer: {
    icon: Tag,
    bg: "bg-red-500/15",
    text: "text-red-600 dark:text-red-400",
  },
  discount: {
    icon: Percent,
    bg: "bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
  },
};

export function ProductBadge({
  variant,
  children,
  className,
}: ProductBadgeProps) {
  const { icon: Icon, bg, text } = config[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full w-fit",
        bg,
        text,
        className,
      )}
    >
      <Icon className="size-3 fill-current" />
      {children}
    </span>
  );
}
