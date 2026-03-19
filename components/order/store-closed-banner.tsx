"use client";

import { Clock } from "lucide-react";

import { useStoreStatus } from "@/hooks/use-store-status";

function getClosedMessage(status: { reason?: string; opensAt?: string }) {
  if (status.reason === "closed_today") return "The store is closed today.";
  if (status.opensAt) return `Opens at ${status.opensAt} today.`;
  return "Please check back during operating hours.";
}

export function StoreClosedBanner() {
  const { data: status } = useStoreStatus();

  if (!status || status.isOpen) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-40 bg-destructive/90 text-white px-4 py-2 flex items-center gap-3 text-sm">
      <Clock className="size-5 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">Store is currently closed</p>
        <p className="text-xs text-white/80">
          {status.isPaused
            ? "Ordering is temporarily paused."
            : getClosedMessage(status)}
        </p>
      </div>
    </div>
  );
}
