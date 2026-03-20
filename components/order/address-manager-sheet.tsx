"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  Check,
  Crosshair,
  Home,
  Loader2,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAddressStore } from "@/lib/stores/address-store";

interface Address {
  id: string;
  label: string;
  street: string;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
}

interface AddressManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LABEL_OPTIONS = ["Home", "Work", "Other"] as const;
type LabelOption = (typeof LABEL_OPTIONS)[number];

const labelIcons: Record<string, React.ReactNode> = {
  Home: <Home className="size-5" />,
  Work: <Briefcase className="size-5" />,
  Other: <MapPin className="size-5" />,
};

function getLabelIcon(label: string) {
  return labelIcons[label] ?? <MapPin className="size-5" />;
}

/* ─────────────── Add Address Dialog ─────────────── */
function AddAddressDialog({
  open,
  onOpenChange,
  tenantSlug,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  onCreated: (addr: Address) => void;
}) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"search" | "form">("search");
  const [newLabel, setNewLabel] = useState<LabelOption>("Home");
  const [newStreet, setNewStreet] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [googleLoaded, setGoogleLoaded] = useState(
    typeof window !== "undefined" && !!window.google?.maps?.places
  );

  useEffect(() => {
    if (open) {
      setStep("search");
      setNewLabel("Home");
      setNewStreet("");
      setNewCity("");
      setNewLat(null);
      setNewLng(null);
      setLocationError(null);
    }
  }, [open]);

  // Google Places
  useEffect(() => {
    if (!googleLoaded || !searchInputRef.current || autocompleteRef.current)
      return;

    const autocomplete = new window.google.maps.places.Autocomplete(
      searchInputRef.current,
      {
        types: ["address"],
        fields: ["formatted_address", "geometry", "address_components"],
      }
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.formatted_address) return;

      const street = place.formatted_address
        .split(",")
        .slice(0, 2)
        .join(",")
        .trim();
      const cityComponent = place.address_components?.find((c: any) =>
        c.types.includes("locality")
      );

      setNewStreet(street);
      setNewCity(cityComponent?.long_name || "");
      setNewLat(place.geometry?.location?.lat() ?? null);
      setNewLng(place.geometry?.location?.lng() ?? null);
      setStep("form");
    });

    autocompleteRef.current = autocomplete;

    return () => {
      window.google.maps.event.clearInstanceListeners(autocomplete);
      autocompleteRef.current = null;
    };
  }, [googleLoaded, open, step]);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
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

          setNewStreet(displayAddress);
          setNewCity(
            data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              ""
          );
          setNewLat(latitude);
          setNewLng(longitude);
          setStep("form");
        } catch {
          setNewStreet(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          setNewLat(latitude);
          setNewLng(longitude);
          setStep("form");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access was denied. Check your browser settings or allow location for this site.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          default:
            setLocationError("Could not determine your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const createMutation = useMutation({
    mutationFn: async (body: {
      label: string;
      street: string;
      city: string | null;
      lat: number | null;
      lng: number | null;
    }) => {
      const res = await fetch(`/api/tenants/${tenantSlug}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to save address");
      }
      const data = await res.json();
      return (data.address ?? data) as Address;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: ["addresses", tenantSlug],
      });
      onCreated(created);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    if (!newStreet.trim()) return;
    createMutation.mutate({
      label: newLabel,
      street: newStreet.trim(),
      city: newCity.trim() || null,
      lat: newLat,
      lng: newLng,
    });
  };

  return (
    <>
      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="lazyOnload"
          onReady={() => setGoogleLoaded(true)}
        />
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="bg-background text-foreground border-0 p-0 sm:max-w-md sm:max-h-[85vh] overflow-hidden shadow-2xl"
          showCloseButton={false}
          onInteractOutside={(e) => {
            // Prevent closing when clicking Google Places autocomplete dropdown
            const target = e.target as HTMLElement;
            if (target.closest?.(".pac-container")) {
              e.preventDefault();
            }
          }}
        >
          {step === "search" ? (
            <>
              {/* Back button */}
              <div className="px-5 pt-5 shrink-0">
                <button
                  onClick={() => onOpenChange(false)}
                  className="size-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors duration-200 cursor-pointer"
                >
                  <ArrowLeft className="size-5 text-foreground" />
                </button>
              </div>

              {/* Title + description */}
              <div className="px-6 pt-4 pb-2">
                <DialogTitle className="text-2xl font-bold text-foreground">
                  Add new address
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  We need your address to find stores that deliver to you.
                  Use location detection for faster and accurate entry.
                </p>
              </div>

              {/* Search input */}
              <div className="px-6 pt-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Street, number, area"
                    className="w-full h-12 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-(--brand-primary,hsl(var(--ring))) transition-all duration-200"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchInputRef.current?.value.trim()) {
                        e.preventDefault();
                        setNewStreet(searchInputRef.current.value.trim());
                        setStep("form");
                      }
                    }}
                  />
                </div>
              </div>

              {/* Location error */}
              {locationError && (
                <p className="text-xs text-destructive text-center px-6">
                  {locationError}
                </p>
              )}

              {/* Use current location */}
              <div className="px-6 pb-6 pt-1">
                <button
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="w-full h-12 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
                  style={{
                    background:
                      "var(--brand-primary, hsl(var(--primary)))",
                    color: "white",
                  }}
                >
                  <Crosshair
                    className={`size-5 ${locating ? "animate-pulse" : ""}`}
                  />
                  {locating ? "Locating..." : "Detect location"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Back to search */}
              <div className="px-5 pt-5 shrink-0">
                <button
                  onClick={() => setStep("search")}
                  className="size-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors duration-200 cursor-pointer"
                >
                  <ArrowLeft className="size-5 text-foreground" />
                </button>
              </div>

              <div className="px-6 pt-2 pb-6">
                <DialogTitle className="text-2xl font-bold text-foreground mb-4">
                  Confirm address
                </DialogTitle>

                <div className="space-y-3">
                  {/* Label selector */}
                  <div className="flex gap-2">
                    {LABEL_OPTIONS.map((label) => {
                      const isActive = newLabel === label;
                      return (
                        <button
                          key={label}
                          onClick={() => setNewLabel(label)}
                          className={`flex-1 h-11 rounded-xl text-[14px] font-medium flex items-center justify-center gap-2 border transition-all duration-200 cursor-pointer ${
                            isActive
                              ? "border-transparent text-white"
                              : "border-border text-muted-foreground hover:border-foreground/30"
                          }`}
                          style={
                            isActive
                              ? {
                                  background:
                                    "var(--brand-primary, hsl(var(--primary)))",
                                }
                              : undefined
                          }
                        >
                          {getLabelIcon(label)}
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Street */}
                  <div>
                    <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
                      Street Address
                    </label>
                    <Input
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      placeholder="e.g. Ermou 10, Athens"
                      className="h-12 rounded-xl text-[15px]"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
                      City
                    </label>
                    <Input
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="e.g. Athens"
                      className="h-12 rounded-xl text-[15px]"
                    />
                  </div>

                  {/* Save */}
                  <button
                    onClick={handleSave}
                    disabled={
                      !newStreet.trim() || createMutation.isPending
                    }
                    className="w-full h-12 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:opacity-60 mt-2"
                    style={{
                      background:
                        "var(--brand-primary, hsl(var(--primary)))",
                      color: "white",
                    }}
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="size-4.5 animate-spin" />
                    ) : (
                      <Check className="size-4.5" />
                    )}
                    {createMutation.isPending
                      ? "Saving..."
                      : "Save Address"}
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ═══════════════════ MAIN: Address List Dialog ═══════════════════ */
export function AddressManagerSheet({
  open,
  onOpenChange,
}: AddressManagerSheetProps) {
  const tenant = useTenant();
  const { selectedAddress, setSelectedAddress } = useAddressStore();
  const [addOpen, setAddOpen] = useState(false);

  const {
    data: addresses = [],
    isLoading,
  } = useQuery<Address[]>({
    queryKey: ["addresses", tenant.slug],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenant.slug}/addresses`);
      if (!res.ok) throw new Error("Failed to fetch addresses");
      const data = await res.json();
      return data.addresses ?? data;
    },
    enabled: open,
  });

  const handleSelectAddress = useCallback(
    (addr: Address) => {
      setSelectedAddress(addr);
      onOpenChange(false);
    },
    [setSelectedAddress, onOpenChange]
  );

  const handleAddressCreated = useCallback(
    (addr: Address) => {
      setSelectedAddress(addr);
      // Don't close the list dialog — user sees the new address selected
    },
    [setSelectedAddress]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="bg-background text-foreground border-0 p-0 sm:max-w-md sm:max-h-[85vh] overflow-hidden shadow-2xl"
          showCloseButton={false}
        >
          {/* Header with back button */}
          <div className="px-5 pt-5 shrink-0">
            <button
              onClick={() => onOpenChange(false)}
              className="size-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors duration-200 cursor-pointer"
            >
              <ArrowLeft className="size-5 text-foreground" />
            </button>
          </div>
          <div className="px-6 pb-2 shrink-0">
            <DialogTitle className="text-2xl font-bold text-foreground">
              Choose address
            </DialogTitle>
          </div>

          {/* Search — opens the add dialog for Google Places */}
          <div className="px-6 pb-3">
            <button
              onClick={() => setAddOpen(true)}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground text-left relative cursor-pointer hover:bg-muted transition-colors duration-200"
            >
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              Search address...
            </button>
          </div>

          {/* Address list */}
          <div className="overflow-y-auto flex-1 px-3">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && addresses.length > 0 && (
              <div>
                {addresses.map((addr) => {
                  const isSelected = selectedAddress?.id === addr.id;
                  return (
                    <button
                      key={addr.id}
                      onClick={() => handleSelectAddress(addr)}
                      className="w-full flex items-start gap-3 px-3 py-3.5 rounded-xl hover:bg-muted/50 transition-colors duration-200 cursor-pointer text-left border-b border-border/30 last:border-b-0"
                    >
                      <MapPin
                        className="size-5 shrink-0 mt-0.5"
                        style={{
                          color: isSelected
                            ? "var(--brand-primary, hsl(var(--primary)))"
                            : "var(--muted-foreground)",
                        }}
                        fill={isSelected ? "currentColor" : "none"}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[15px] text-foreground leading-tight">
                          {addr.street}
                        </p>
                        <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                          {[addr.city, addr.postalCode]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        {addr.label && (
                          <p className="text-[12px] text-muted-foreground/70 mt-0.5 truncate">
                            {addr.label}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {!isLoading && addresses.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No saved addresses yet.
              </p>
            )}
          </div>

          {/* Add new address button */}
          <div className="px-6 py-5 shrink-0">
            <button
              onClick={() => setAddOpen(true)}
              className="w-full h-12 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 active:scale-[0.98]"
              style={{
                background:
                  "var(--brand-primary, hsl(var(--primary)))",
                color: "white",
              }}
            >
              <Plus className="size-4.5" />
              Add new address
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AddAddressDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        tenantSlug={tenant.slug}
        onCreated={handleAddressCreated}
      />
    </>
  );
}
