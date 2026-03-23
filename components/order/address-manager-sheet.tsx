"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  Check,
  Crosshair,
  Home,
  Loader2,
  MapPin,
  MapPinOff,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CONFIRM_DIALOG } from "@/components/confirm-dialog";
import { useTenant } from "@/components/tenant-provider";
import { DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { type Address, useAddressStore } from "@/lib/stores/address-store";
import { selectDialogData, useDialogStore } from "@/lib/stores/dialog-store";
import {
  getPlaceDetails,
  type PlacePrediction,
  searchPlaces,
} from "@/server_actions/googleSearchActions";

export const ADDRESS_MANAGER_DIALOG = "address-manager";

type ViewState = "list" | "search" | "form";

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

const LABEL_TRANSLATION_KEYS: Record<string, string> = {
  Home: "home",
  Work: "work",
  Other: "other",
};

export function AddressManagerContent() {
  const t = useTranslations("Address");
  const openDialog = useDialogStore((s) => s.openDialog);
  const closeAll = useDialogStore((s) => s.closeAll);
  const dialogData = useDialogStore(selectDialogData) as
    | { initialView?: ViewState }
    | null
    | undefined;
  const tenant = useTenant();
  const { data: session } = useSession();
  const {
    addresses,
    selectedAddress,
    setSelectedAddress,
    addAddress,
    removeAddress,
  } = useAddressStore();

  const initialView = dialogData?.initialView ?? "list";

  const [view, setView] = useState<ViewState>(initialView);

  // Add-address form state
  const [newLabel, setNewLabel] = useState<LabelOption>("Home");
  const [newStreet, setNewStreet] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Google Places search
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectingPlace, setSelectingPlace] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset form on mount
  useEffect(() => {
    setView(initialView);
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setNewLabel("Home");
    setNewStreet("");
    setNewCity("");
    setNewLat(null);
    setNewLng(null);
    setLocationError(null);
    setQuery("");
    setPredictions([]);
  }

  // Debounced search via server action
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 3) {
      setPredictions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(query, "address");
      setPredictions(results);
      setSearching(false);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setSelectingPlace(true);
    const details = await getPlaceDetails(prediction.place_id);
    setSelectingPlace(false);

    if (details) {
      const street = details.formatted_address
        .split(",")
        .slice(0, 2)
        .join(",")
        .trim();
      setNewStreet(street);
      setNewLat(details.coordinates.lat);
      setNewLng(details.coordinates.lng);

      const parts = details.formatted_address.split(",").map((s) => s.trim());
      setNewCity(parts[2] || parts[1] || "");
    } else {
      setNewStreet(prediction.description);
    }
    setView("form");
  };

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t("geolocationNotSupported"));
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
          setView("form");
        } catch {
          setNewStreet(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          setNewLat(latitude);
          setNewLng(longitude);
          setView("form");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError(t("locationDenied"));
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError(t("locationUnavailable"));
            break;
          default:
            setLocationError(t("locationError"));
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [t]);

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
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || t("saveFailed"));
      }
      const data = await res.json();
      return (data.address ?? data) as Address;
    },
    onSuccess: (created) => {
      addAddress(created);
      setSelectedAddress(created);
      setView("list");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/api/tenants/${tenant.slug}/addresses/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
      return id;
    },
    onSuccess: (id) => {
      removeAddress(id);
    },
    onError: () => {
      toast.error(t("deleteFailed"));
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

  const handleSelectAddress = useCallback(
    (addr: Address) => {
      setSelectedAddress(addr);
      closeAll();
    },
    [setSelectedAddress, closeAll]
  );

  const handleAddAddress = useCallback(() => {
    if (!session) {
      openDialog("auth");
    } else {
      setView("search");
    }
  }, [session, openDialog]);

  const handleBack = () => {
    if (view === "form") setView("search");
    else if (view === "search") setView("list");
    // list view: handled by DialogProvider's back/close buttons
  };

  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      {/* list view */}
      {view === "list" && (
        <>
          <div className="px-6 pb-2 shrink-0">
            <DialogTitle className="text-2xl font-bold text-foreground">
              {t("chooseAddress")}
            </DialogTitle>
          </div>

          <div className="overflow-y-auto flex-1 px-3">
            {addresses.length > 0 ? (
              <div>
                {addresses.map((addr) => {
                  const isSelected = selectedAddress?.id === addr.id;
                  return (
                    <div
                      key={addr.id}
                      className={`flex items-center gap-1 rounded-xl my-1 transition-all duration-200 hover:bg-muted/50 ${
                        isSelected
                          ? "ring-2 ring-(--brand-primary,hsl(var(--primary)))"
                          : ""
                      }`}
                    >
                      <button
                        onClick={() => handleSelectAddress(addr)}
                        className="flex-1 flex items-start gap-3 px-3 py-3.5 rounded-xl transition-colors duration-200 cursor-pointer text-left"
                      >
                        <MapPin
                          className="size-5 shrink-0 mt-0.5 text-muted-foreground"
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
                      <button
                        onClick={() =>
                          openDialog(
                            CONFIRM_DIALOG,
                            {
                              title: "Delete address?",
                              description: "This will permanently delete this saved address.",
                              actionLabel: "Delete",
                            },
                            () => deleteMutation.mutate(addr.id)
                          )
                        }
                        disabled={deleteMutation.isPending}
                        className="size-9 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-colors duration-200 cursor-pointer shrink-0 mr-2"
                      >
                        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="size-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                  <MapPinOff className="size-7 text-muted-foreground" />
                </div>
                <p className="text-base font-semibold text-foreground mb-1">
                  {t("noAddresses")}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("noAddressesDesc")}
                </p>
              </div>
            )}
          </div>

          <div className="px-6 py-5 shrink-0">
            <button
              onClick={handleAddAddress}
              className="w-full h-12 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 active:scale-[0.98]"
              style={{
                background:
                  "var(--brand-primary, hsl(var(--primary)))",
                color: "white",
              }}
            >
              <Plus className="size-4.5" />
              {t("addNewAddress")}
            </button>
          </div>
        </>
      )}

      {/* search view */}
      {view === "search" && (
        <>
          <div className="px-5 shrink-0">
            <button
              onClick={handleBack}
              className="size-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors duration-200 cursor-pointer"
            >
              <ArrowLeft className="size-5 text-foreground" />
            </button>
          </div>

          <div className="px-6 pt-4 pb-2">
            <DialogTitle className="text-2xl font-bold text-foreground">
              {t("addNewAddressTitle")}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {t("addNewAddressDesc")}
            </p>
          </div>

          <div className="px-6 pt-4 pb-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-(--brand-primary,hsl(var(--ring))) transition-all duration-200"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    e.preventDefault();
                    setNewStreet(query.trim());
                    setView("form");
                  }
                }}
              />
              {searching && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
              )}
            </div>
          </div>

          {predictions.length > 0 && (
            <div className="px-6 pb-2 max-h-48 overflow-y-auto">
              {selectingPlace && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!selectingPlace &&
                predictions.map((p) => (
                  <button
                    key={p.place_id}
                    onClick={() => handleSelectPrediction(p)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors duration-200 cursor-pointer text-left"
                  >
                    <MapPin className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {p.structured_formatting.main_text}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.structured_formatting.secondary_text}
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {locationError && (
            <p className="text-xs text-destructive text-center px-6">
              {locationError}
            </p>
          )}

          <div className="px-6 pb-6 pt-3">
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
              {locating ? t("locating") : t("detectLocation")}
            </button>
          </div>
        </>
      )}

      {/* form view */}
      {view === "form" && (
        <>
          <div className="px-5 shrink-0">
            <button
              onClick={handleBack}
              className="size-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors duration-200 cursor-pointer"
            >
              <ArrowLeft className="size-5 text-foreground" />
            </button>
          </div>

          <div className="px-6 pt-2 pb-6">
            <DialogTitle className="text-2xl font-bold text-foreground mb-4">
              {t("confirmAddress")}
            </DialogTitle>

            <div className="space-y-3">
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
                      {t(LABEL_TRANSLATION_KEYS[label])}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
                  {t("streetAddress")}
                </label>
                <Input
                  value={newStreet}
                  onChange={(e) => setNewStreet(e.target.value)}
                  placeholder={t("streetPlaceholder")}
                  className="h-12 rounded-xl text-[15px]"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
                  {t("city")}
                </label>
                <Input
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder={t("cityPlaceholder")}
                  className="h-12 rounded-xl text-[15px]"
                />
              </div>

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
                  ? t("saving")
                  : t("saveAddress")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
