"use client";

import { LogIn, MapPin, Navigation, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback,useEffect, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link } from "@/lib/i18n/navigation";

const LOCATION_DISMISSED_KEY = "location-prompt-dismissed";
const LOCATION_STORED_KEY = "user-location";

interface LocationPromptProps {
  onLocationSet?: (address: string) => void;
}

export function LocationPrompt({ onLocationSet }: LocationPromptProps) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    // Only show if not authenticated and not previously dismissed
    if (status === "loading") return;
    if (status === "authenticated") return;

    const dismissed = localStorage.getItem(LOCATION_DISMISSED_KEY);
    const stored = localStorage.getItem(LOCATION_STORED_KEY);
    if (!dismissed && !stored) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    localStorage.setItem(LOCATION_DISMISSED_KEY, "true");
  }, []);

  const handleAddressSubmit = useCallback(() => {
    if (!address.trim()) return;
    localStorage.setItem(LOCATION_STORED_KEY, address.trim());
    localStorage.setItem(LOCATION_DISMISSED_KEY, "true");
    setOpen(false);
    onLocationSet?.(address.trim());
  }, [address, onLocationSet]);

  const handleShareLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Try reverse geocoding with OpenStreetMap Nominatim (free)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "el,en" } }
          );
          const data = await res.json();
          const displayAddress =
            data.address?.road && data.address?.house_number
              ? `${data.address.road} ${data.address.house_number}, ${data.address.city || data.address.town || data.address.village || ""}`
              : data.display_name?.split(",").slice(0, 3).join(",") ||
                `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          setAddress(displayAddress);
          localStorage.setItem(LOCATION_STORED_KEY, displayAddress);
          localStorage.setItem(LOCATION_DISMISSED_KEY, "true");
          setOpen(false);
          onLocationSet?.(displayAddress);
        } catch {
          // Fallback to coords
          const coordStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setAddress(coordStr);
          localStorage.setItem(LOCATION_STORED_KEY, coordStr);
          localStorage.setItem(LOCATION_DISMISSED_KEY, "true");
          setOpen(false);
          onLocationSet?.(coordStr);
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. Please enter your address manually.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location unavailable. Please enter your address manually.");
            break;
          default:
            setLocationError("Could not get location. Please enter your address manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onLocationSet]);

  // Don't render for authenticated users
  if (status === "authenticated") return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleDismiss(); else setOpen(v); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl p-0 gap-0 max-h-[85vh]"
        showCloseButton={false}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-10 size-8 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200 cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <SheetHeader className="px-6 pt-3 pb-2">
          <SheetTitle className="text-[18px] font-bold text-left leading-tight">
            Tell us where you are
          </SheetTitle>
          <p className="text-[14px] text-muted-foreground text-left leading-snug mt-1">
            Help us confirm availability and delivery fees.
          </p>
        </SheetHeader>

        <div className="px-6 pb-8 pt-4 space-y-3">
          {/* Address input */}
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-[18px] text-muted-foreground" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddressSubmit()}
              placeholder="Enter street and number"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/50 border border-border/60 text-[15px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,hsl(var(--ring)))] focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Share location button */}
          <button
            onClick={handleShareLocation}
            disabled={locating}
            className="w-full h-12 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-60"
            style={{
              background: "var(--brand-primary, hsl(var(--primary)))",
              color: "white",
            }}
          >
            <Navigation className={`size-[18px] ${locating ? "animate-pulse" : ""}`} />
            {locating ? "Locating..." : "Share your location"}
          </button>

          {/* Error message */}
          {locationError && (
            <p className="text-xs text-destructive text-center px-2">
              {locationError}
            </p>
          )}

          {/* Sign in link */}
          <Link
            href="/auth/signin"
            className="w-full h-12 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 border border-border/80 text-foreground hover:bg-muted/50 transition-colors duration-200"
          >
            <LogIn className="size-[18px]" />
            Sign in for saved addresses
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
