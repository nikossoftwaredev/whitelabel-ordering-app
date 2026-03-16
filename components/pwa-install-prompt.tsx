"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent;
  }
}

interface TenantMeta {
  name: string;
  icons?: { src: string }[];
}

const DISMISSED_KEY = "pwa-prompt-dismissed";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [tenantMeta, setTenantMeta] = useState<TenantMeta | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((window.navigator as unknown as { standalone?: boolean }).standalone) return;
    // Already dismissed this session
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    // Always show
    setVisible(true);

    // Fetch branding (non-blocking — fallback used if this fails)
    fetch("/api/manifest")
      .then((r) => r.json())
      .then((data: TenantMeta) => setTenantMeta(data))
      .catch(() => {});

    // Pick up native install prompt if already captured before mount
    if (window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt);
      window.__pwaInstallPrompt = undefined;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dismiss();
      else setDeferredPrompt(null);
    } catch {
      // ignore
    }
  };

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const appName = tenantMeta?.name ?? "App";
  const iconSrc = tenantMeta?.icons?.[0]?.src;
  const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        onClick={dismiss}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md pointer-events-auto rounded-t-2xl bg-background shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
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
            <img src={iconSrc} alt={appName} className="size-16 rounded-2xl shadow-md object-cover" />
          ) : (
            <div className="size-16 rounded-2xl bg-primary flex items-center justify-center shadow-md">
              <span className="text-2xl font-bold text-primary-foreground">
                {appName.slice(0, 1)}
              </span>
            </div>
          )}

          <div className="space-y-1">
            <h2 className="text-xl font-bold">{appName}</h2>
            <p className="text-sm text-muted-foreground">Get the full experience — install the app</p>
          </div>

          {/* Action area — adapts per platform */}
          {deferredPrompt ? (
            <Button className="w-full rounded-xl h-12 text-base font-semibold" onClick={handleInstall}>
              Add to Home Screen
            </Button>
          ) : isIos ? (
            <div className="w-full rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground text-left">
              Tap the <strong>Share</strong> button in Safari, then tap{" "}
              <strong>Add to Home Screen</strong>.
            </div>
          ) : (
            <div className="w-full rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground text-left">
              Open this page in <strong>Chrome</strong> or <strong>Safari</strong> on your phone
              and tap <strong>Add to Home Screen</strong>.
            </div>
          )}

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
