"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  Check,
  Crosshair,
  Home,
  Loader2,
  MapPin,
  MapPinOff,
  Search,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AddButton } from "@/components/add-button";
import { CONFIRM_DIALOG } from "@/components/confirm-dialog";
import { PillSelector } from "@/components/pill-selector";
import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getAddressLabelIcon } from "@/lib/address/label-icon";
import { type Address, useAddressStore } from "@/lib/stores/address-store";

const AddressMap = dynamic(() =>
  import("@/components/order/address-map").then((m) => m.AddressMap),
  { ssr: false, loading: () => <div className="h-50 animate-pulse bg-muted rounded-lg" /> }
);
import { Textarea } from "@/components/ui/textarea";
import { selectDialogData, useDialogStore } from "@/lib/stores/dialog-store";
import {
  getPlaceDetails,
  type PlacePrediction,
  reverseGeocode,
  searchPlaces,
} from "@/server_actions/googleSearchActions";

export const ADDRESS_MANAGER_DIALOG = "address-manager";

type ViewState = "list" | "search" | "form";

const LABEL_OPTIONS = ["Home", "Work", "Other"] as const;
type LabelOption = (typeof LABEL_OPTIONS)[number];


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
  const [locationType, setLocationType] = useState<string>("house");
  const [newFloor, setNewFloor] = useState("");
  const [newApartmentNumber, setNewApartmentNumber] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [entrance, setEntrance] = useState<string>("");
  const [accessDetails, setAccessDetails] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

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
    setLocationType("house");
    setNewFloor("");
    setNewApartmentNumber("");
    setNewCompanyName("");
    setEntrance("");
    setAccessDetails("");
    setDeliveryInstructions("");
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

  const handlePinMove = useCallback(async (newLat: number, newLng: number) => {
    setNewLat(newLat);
    setNewLng(newLng);
    const result = await reverseGeocode(newLat, newLng);
    if (result) {
      setNewStreet(result.street);
      setNewCity(result.city);
    }
  }, []);

  const createMutation = useMutation({
    mutationFn: async (body: {
      label: string;
      street: string;
      city: string | null;
      lat: number | null;
      lng: number | null;
      locationType: string | null;
      floor: string | null;
      apartmentNumber: string | null;
      companyName: string | null;
      entrance: string | null;
      accessDetails: string | null;
      deliveryInstructions: string | null;
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
      locationType: locationType || null,
      floor: newFloor.trim() || null,
      apartmentNumber: newApartmentNumber.trim() || null,
      companyName: newCompanyName.trim() || null,
      entrance: entrance || null,
      accessDetails: accessDetails.trim() || null,
      deliveryInstructions: deliveryInstructions.trim() || null,
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
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {t("chooseAddress")}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-3">
            {addresses.length > 0 ? (
              <div>
                {addresses.map((addr) => {
                  const isSelected = selectedAddress?.id === addr.id;
                  return (
                    <div
                      key={addr.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectAddress(addr)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectAddress(addr);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl my-1 transition-all duration-200 cursor-pointer text-left ${
                        isSelected
                          ? "bg-primary/10"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        {isSelected ? (
                          <Check className="size-4" />
                        ) : (
                          getAddressLabelIcon(addr.label, "size-4 text-muted-foreground")
                        )}
                      </div>
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
                          <span className="inline-block text-[11px] text-muted-foreground/80 mt-1 px-2 py-0.5 bg-muted rounded-full">
                            {addr.label}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDialog(
                            CONFIRM_DIALOG,
                            {
                              title: "Delete address?",
                              description: "This will permanently delete this saved address.",
                              actionLabel: "Delete",
                            },
                            () => deleteMutation.mutate(addr.id)
                          );
                        }}
                        disabled={deleteMutation.isPending}
                        className="size-8 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-colors duration-200 cursor-pointer shrink-0"
                      >
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
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
            <AddButton
              variant="brand"
              onClick={handleAddAddress}
              className="w-full h-12 rounded-xl font-semibold text-[15px]"
            >
              {t("addNewAddress")}
            </AddButton>
          </div>
        </>
      )}

      {/* search view */}
      {view === "search" && (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {t("addNewAddressTitle")}
            </DialogTitle>
          </DialogHeader>

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
            <Button
              variant="brand"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              icon={<Crosshair className={`size-5 ${locating ? "animate-pulse" : ""}`} />}
              className="w-full h-12 rounded-xl font-semibold text-[15px]"
            >
              {locating ? t("locating") : t("detectLocation")}
            </Button>
          </div>
        </>
      )}

      {/* form view */}
      {view === "form" && (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {t("confirmAddress")}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6 overflow-y-auto flex-1">

            <div className="space-y-4">
              {/* Map with draggable pin */}
              {newLat != null && newLng != null && (
                <div className="space-y-1">
                  <AddressMap lat={newLat} lng={newLng} onPositionChange={handlePinMove} />
                  <p className="text-xs text-muted-foreground text-center">{t("refinePin")}</p>
                </div>
              )}

              {/* Street + City */}
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

              {/* Location type pills */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-muted-foreground block">
                  {t("locationType")}
                </label>
                <PillSelector
                  options={[
                    { key: "house", icon: <Home className="size-4" />, label: t("house") },
                    { key: "apartment", icon: <Building2 className="size-4" />, label: t("apartment") },
                    { key: "office", icon: <Briefcase className="size-4" />, label: t("office") },
                    { key: "other", icon: <MapPin className="size-4" />, label: t("otherType") },
                  ]}
                  value={locationType}
                  onChange={setLocationType}
                  pillClassName="flex-1"
                />
              </div>

              {/* Floor */}
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
                  {t("floor")}
                </label>
                <Input
                  value={newFloor}
                  onChange={(e) => setNewFloor(e.target.value)}
                  placeholder={t("floorPlaceholder")}
                  className="h-12 rounded-xl text-[15px]"
                />
              </div>

              {/* Conditional: Apartment number */}
              {locationType === "apartment" && (
                <div>
                  <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
                    {t("apartmentNumber")}
                  </label>
                  <Input
                    value={newApartmentNumber}
                    onChange={(e) => setNewApartmentNumber(e.target.value)}
                    placeholder={t("apartmentPlaceholder")}
                    className="h-12 rounded-xl text-[15px]"
                  />
                </div>
              )}

              {/* Conditional: Company name */}
              {locationType === "office" && (
                <div>
                  <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
                    {t("companyName")}
                  </label>
                  <Input
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder={t("companyPlaceholder")}
                    className="h-12 rounded-xl text-[15px]"
                  />
                </div>
              )}

              {/* Entrance access pills */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-muted-foreground block">
                  {t("entranceAccess")}
                </label>
                <PillSelector
                  options={[
                    { key: "doorbell", label: t("doorbell") },
                    { key: "door_code", label: t("doorCode") },
                    { key: "door_open", label: t("doorOpen") },
                    { key: "other", label: t("otherAccess") },
                  ]}
                  value={entrance}
                  onChange={setEntrance}
                  deselectable
                  pillClassName="h-9 rounded-lg"
                />
              </div>

              {/* Access details */}
              {entrance && (
                <div>
                  <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
                    {t("accessDetails")}
                  </label>
                  <Input
                    value={accessDetails}
                    onChange={(e) => setAccessDetails(e.target.value)}
                    placeholder={t("accessDetailsPlaceholder")}
                    className="h-12 rounded-xl text-[15px]"
                  />
                </div>
              )}

              {/* Delivery instructions */}
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
                  {t("deliveryInstructions")}
                </label>
                <Textarea
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder={t("deliveryInstructionsPlaceholder")}
                  rows={2}
                  className="rounded-xl text-[15px] resize-none"
                />
              </div>

              {/* Label selector */}
              <PillSelector
                options={LABEL_OPTIONS.map((label) => ({
                  key: label,
                  label: t(LABEL_TRANSLATION_KEYS[label]),
                  icon: getAddressLabelIcon(label),
                }))}
                value={newLabel}
                onChange={setNewLabel}
                pillClassName="flex-1 h-11 text-[14px]"
              />

              {/* Save button */}
              <Button
                variant="brand"
                onClick={handleSave}
                disabled={!newStreet.trim()}
                loading={createMutation.isPending}
                icon={<Check className="size-4.5" />}
                className="w-full h-12 rounded-xl font-semibold text-[15px] mt-2"
              >
                {createMutation.isPending ? t("saving") : t("saveAddress")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
