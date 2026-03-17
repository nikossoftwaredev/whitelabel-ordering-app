"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Check,
  Home,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  Trash2,
} from "lucide-react";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Home: <Home className="size-4" />,
  Work: <Briefcase className="size-4" />,
  Other: <MapPin className="size-4" />,
};

function getLabelIcon(label: string) {
  return labelIcons[label] ?? <MapPin className="size-4" />;
}

export function AddressManagerSheet({
  open,
  onOpenChange,
}: AddressManagerSheetProps) {
  const tenant = useTenant();
  const queryClient = useQueryClient();
  const { selectedAddress, setSelectedAddress } = useAddressStore();

  // Form state
  const [mode, setMode] = useState<"list" | "add">("list");
  const [newLabel, setNewLabel] = useState<LabelOption>("Home");
  const [newStreet, setNewStreet] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);

  // Geolocation state
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Google Places autocomplete
  const searchInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  const [googleLoaded, setGoogleLoaded] = useState(
    typeof window !== "undefined" && !!window.google?.maps?.places
  );

  // Reset form when sheet opens
  useEffect(() => {
    if (open) {
      setMode("list");
      resetForm();
    }
  }, [open]);

  // Initialize Google Places Autocomplete when script loads and input is visible
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

      const street = place.formatted_address.split(",").slice(0, 2).join(",").trim();
      const cityComponent = place.address_components?.find((c: any) =>
        c.types.includes("locality")
      );

      setNewStreet(street);
      setNewCity(cityComponent?.long_name || "");
      setNewLat(place.geometry?.location?.lat() ?? null);
      setNewLng(place.geometry?.location?.lng() ?? null);
      setMode("add");
    });

    autocompleteRef.current = autocomplete;

    return () => {
      window.google.maps.event.clearInstanceListeners(autocomplete);
      autocompleteRef.current = null;
    };
  }, [googleLoaded, open, mode]);

  const resetForm = () => {
    setNewLabel("Home");
    setNewStreet("");
    setNewCity("");
    setNewLat(null);
    setNewLng(null);
    setLocationError(null);
  };

  // ----- Queries & Mutations -----

  const {
    data: addresses = [],
    isLoading,
  } = useQuery<Address[]>({
    queryKey: ["addresses", tenant.slug],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenant.slug}/addresses`);
      if (!res.ok) throw new Error("Failed to fetch addresses");
      return res.json();
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async (body: {
      label: string;
      street: string;
      city: string | null;
      lat: number | null;
      lng: number | null;
    }) => {
      const res = await fetch(`/api/tenants/${tenant.slug}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create address");
      return res.json() as Promise<Address>;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["addresses", tenant.slug] });
      setSelectedAddress(created);
      setMode("list");
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/api/tenants/${tenant.slug}/addresses/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete address");
    },
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["addresses", tenant.slug] });
      if (selectedAddress?.id === deletedId) {
        setSelectedAddress(null);
      }
    },
  });

  // ----- Handlers -----

  const handleSelectAddress = useCallback(
    (addr: Address) => {
      setSelectedAddress(addr);
      onOpenChange(false);
    },
    [setSelectedAddress, onOpenChange]
  );

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

          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            "";

          setNewStreet(displayAddress);
          setNewCity(city);
          setNewLat(latitude);
          setNewLng(longitude);
          setMode("add");
        } catch {
          const coordStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setNewStreet(coordStr);
          setNewLat(latitude);
          setNewLng(longitude);
          setMode("add");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access was denied.");
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

  const handleSaveAddress = () => {
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

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl p-0 gap-0 max-h-[85vh] overflow-y-auto"
          showCloseButton={false}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          <SheetHeader className="px-6 pt-3 pb-2">
            <SheetTitle className="text-[18px] font-bold text-left leading-tight">
              {mode === "add" ? "Add Address" : "Delivery Address"}
            </SheetTitle>
          </SheetHeader>

          <div className="px-6 pb-8 pt-2 space-y-4">
            {mode === "list" && (
              <>
                {/* Saved addresses list */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : addresses.length > 0 ? (
                  <div className="space-y-2">
                    {addresses.map((addr) => {
                      const isSelected = selectedAddress?.id === addr.id;
                      return (
                        <div
                          key={addr.id}
                          className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                            isSelected
                              ? "border-[var(--brand-primary,hsl(var(--primary)))] bg-[var(--brand-primary,hsl(var(--primary)))]/5"
                              : "border-border/60 hover:border-border"
                          }`}
                          onClick={() => handleSelectAddress(addr)}
                        >
                          {/* Icon */}
                          <div
                            className={`flex items-center justify-center size-10 rounded-full shrink-0 ${
                              isSelected
                                ? "text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                            style={
                              isSelected
                                ? {
                                    background:
                                      "var(--brand-primary, hsl(var(--primary)))",
                                  }
                                : undefined
                            }
                          >
                            {getLabelIcon(addr.label)}
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[14px]">
                                {addr.label}
                              </span>
                              {addr.isDefault && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] text-muted-foreground truncate">
                              {addr.street}
                              {addr.city ? `, ${addr.city}` : ""}
                            </p>
                          </div>

                          {/* Selection check */}
                          {isSelected && (
                            <Check
                              className="size-5 shrink-0"
                              style={{
                                color:
                                  "var(--brand-primary, hsl(var(--primary)))",
                              }}
                            />
                          )}

                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(addr.id);
                            }}
                            disabled={deleteMutation.isPending}
                            className="size-8 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors duration-200 shrink-0 cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-[14px] text-muted-foreground py-4">
                    No saved addresses yet.
                  </p>
                )}

                {/* Divider */}
                <div className="h-px bg-border/60" />

                {/* Use current location */}
                <button
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="w-full h-12 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-60"
                  style={{
                    background:
                      "var(--brand-primary, hsl(var(--primary)))",
                    color: "white",
                  }}
                >
                  <Navigation
                    className={`size-[18px] ${locating ? "animate-pulse" : ""}`}
                  />
                  {locating ? "Locating..." : "Use current location"}
                </button>

                {locationError && (
                  <p className="text-xs text-destructive text-center px-2">
                    {locationError}
                  </p>
                )}

                {/* Search address input */}
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-[18px] text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search address..."
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/50 border border-border/60 text-[15px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,hsl(var(--ring)))] focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Add new address button */}
                <button
                  onClick={() => setMode("add")}
                  className="w-full h-12 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 border border-border/80 text-foreground hover:bg-muted/50 transition-colors duration-200 cursor-pointer"
                >
                  <Plus className="size-[18px]" />
                  Add new address
                </button>
              </>
            )}

            {mode === "add" && (
              <>
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
                            ? "border-[var(--brand-primary,hsl(var(--primary)))] text-white"
                            : "border-border/60 text-foreground hover:border-border"
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

                {/* Street input (auto-filled from search/geolocation) */}
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

                {/* City input */}
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

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-xl text-[15px] font-semibold cursor-pointer"
                    onClick={() => {
                      setMode("list");
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <button
                    onClick={handleSaveAddress}
                    disabled={
                      !newStreet.trim() || createMutation.isPending
                    }
                    className="flex-1 h-12 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-60"
                    style={{
                      background:
                        "var(--brand-primary, hsl(var(--primary)))",
                      color: "white",
                    }}
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="size-[18px] animate-spin" />
                    ) : (
                      <Check className="size-[18px]" />
                    )}
                    {createMutation.isPending ? "Saving..." : "Save Address"}
                  </button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
