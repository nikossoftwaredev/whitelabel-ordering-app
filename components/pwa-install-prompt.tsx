"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Pwa");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [tenantMeta, setTenantMeta] = useState<TenantMeta | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isInstalled) return;

    // Only show on mobile/tablet — not desktop
    const isMobileOrTablet = /android|iphone|ipad|ipod|mobile|tablet/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
    if (!isMobileOrTablet) return;

    // Show on first load if not dismissed
    if (!sessionStorage.getItem(DISMISSED_KEY)) {
      setVisible(true);
    }

    // Fetch branding from Next.js manifest convention (non-blocking)
    fetch("/manifest.webmanifest")
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

    // Allow re-showing from other components (e.g. dropdown menu "Download App")
    const showHandler = () => {
      sessionStorage.removeItem(DISMISSED_KEY);
      setVisible(true);
    };
    window.addEventListener("show-pwa-prompt", showHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("show-pwa-prompt", showHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dismiss();
    } catch {
      // prompt() can only be called once — ignore errors
    } finally {
      // Clear regardless — prompt is one-shot
      setDeferredPrompt(null);
      window.__pwaInstallPrompt = undefined;
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
            <p className="text-sm text-muted-foreground">{t("getFullExperience")}</p>
          </div>

          {/* Action area — adapts per platform */}
          {deferredPrompt && (
            <Button className="w-full rounded-xl h-12 text-base font-semibold" onClick={handleInstall}>
              {t("addToHomeScreen")}
            </Button>
          )}
          {!deferredPrompt && (
            <div className="w-full rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground text-left">
              {isIos ? t("iosTip") : t("androidTip")}
            </div>
          )}

          <button
            onClick={dismiss}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("keepUsingWeb")}
          </button>
        </div>
      </div>
    </div>
  );
}
