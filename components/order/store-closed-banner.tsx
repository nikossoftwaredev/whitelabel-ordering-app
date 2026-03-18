"use client";

import { Clock } from "lucide-react";

import { useStoreStatus } from "@/hooks/use-store-status";

export function StoreClosedBanner() {
  const { data: status } = useStoreStatus();

  if (!status || status.isOpen) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 flex items-center gap-3">
      <Clock className="size-5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">Store is currently closed</p>
        <p className="text-xs opacity-80">
          {status.isPaused
            ? "Ordering is temporarily paused."
            : status.reason === "closed_today"
              ? "The store is closed today."
              : status.opensAt
                ? `Opens at ${status.opensAt} today.`
                : "Please check back during operating hours."}
        </p>
      </div>
    </div>
  );
}
