import { cn } from "@/lib/general/utils";

export function PresetBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        className,
      )}
    >
      ΑΠ&apos; ΟΛΑ
    </span>
  );
}
