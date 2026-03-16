"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface TenantMeta {
  name: string;
  icons?: { src: string }[];
}

const DISMISSED_KEY = "pwa-prompt-dismissed";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [tenantMeta, setTenantMeta] = useState<TenantMeta | null>(null);
  const [visible, setVisible] = useState(false);

  // Don't show if already installed (standalone mode) or previously dismissed
  const isStandalone =
    typeof window !== "undefined" &&
    window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    if (isStandalone) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    // Fetch tenant branding from manifest API
    fetch("/api/manifest")
      .then((r) => r.json())
      .then((data: TenantMeta) => setTenantMeta(data))
      .catch(() => {});

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari doesn't fire beforeinstallprompt — show prompt anyway
    const isIos =
      /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) &&
      !(window.navigator as unknown as { standalone?: boolean }).standalone;

    if (isIos) {
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isStandalone]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      }
      setDeferredPrompt(null);
    }
    dismiss();
  };

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible || !tenantMeta) return null;

  const iconSrc = tenantMeta.icons?.[0]?.src;
  const isIos =
    typeof window !== "undefined" &&
    /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        onClick={dismiss}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md pointer-events-auto rounded-t-2xl bg-background shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Dismiss button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="size-4 text-muted-foreground" />
        </button>

        <div className="px-6 pt-6 pb-8 flex flex-col items-center text-center gap-4">
          {/* App icon */}
          {iconSrc ? (
            <img
              src={iconSrc}
              alt={tenantMeta.name}
              className="size-16 rounded-2xl shadow-md object-cover"
            />
          ) : (
            <div className="size-16 rounded-2xl bg-primary flex items-center justify-center shadow-md">
              <span className="text-2xl font-bold text-primary-foreground">
                {tenantMeta.name.slice(0, 1)}
              </span>
            </div>
          )}

          {/* Text */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold">{tenantMeta.name}</h2>
            <p className="text-sm text-muted-foreground">
              Get the full experience
            </p>
          </div>

          {/* Install button */}
          {deferredPrompt ? (
            <Button className="w-full rounded-xl h-12 text-base font-semibold" onClick={handleInstall}>
              Add to Home Screen
            </Button>
          ) : isIos ? (
            <div className="w-full rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground text-left space-y-1">
              <p>
                Tap the <strong>Share</strong> button in Safari, then select{" "}
                <strong>Add to Home Screen</strong>.
              </p>
            </div>
          ) : null}

          {/* Keep using web */}
          <button
            onClick={dismiss}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Keep using web
          </button>
        </div>
      </div>
    </div>
  );
}
