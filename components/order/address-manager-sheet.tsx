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
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AddButton } from "@/components/add-button";
import { PillSelector } from "@/components/pill-selector";
import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getAddressLabelIcon } from "@/lib/address/label-icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Address, useAddressStore } from "@/lib/stores/address-store";
import { selectDialogData, useDialogStore } from "@/lib/stores/dialog-store";
import {
  getPlaceDetails,
  type PlacePrediction,
  reverseGeocode,
  searchPlaces,
} from "@/server_actions/googleSearchActions";

const AddressMap = dynamic(
  () => import("@/components/order/address-map").then((m) => m.AddressMap),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-muted rounded-xl" /> }
);

export const ADDRESS_MANAGER_DIALOG = "address-manager";

type ViewState = "list" | "search" | "form";

const LABEL_OPTIONS = ["Home", "Work", "Other"] as const;
type LabelOption = (typeof LABEL_OPTIONS)[number];

const LABEL_TRANSLATION_KEYS: Record<string, string> = {
  Home: "home",
  Work: "work",
  Other: "other",
};

const DELIVERY_SPOT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  house: [
    { value: "at_door", label: "At the door" },
    { value: "at_entrance", label: "At the entrance" },
    { value: "leave_outside", label: "Leave it outside" },
  ],
  apartment: [
    { value: "at_door", label: "At the door" },
    { value: "at_entrance", label: "At the entrance" },
    { value: "leave_outside", label: "Leave it outside" },
  ],
  office: [
    { value: "to_office", label: "To the office" },
    { value: "to_reception", label: "To reception" },
    { value: "at_entrance", label: "At the entrance" },
  ],
  other: [
    { value: "at_door", label: "At the door" },
    { value: "at_entrance", label: "At the entrance" },
  ],
};

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pt-2 pb-1">
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

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
  const { addresses, selectedAddress, setSelectedAddress, addAddress, removeAddress, updateAddress } =
    useAddressStore();

  const initialView = dialogData?.initialView ?? "list";
  const [view, setView] = useState<ViewState>(initialView);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Form state
  const [newLabel, setNewLabel] = useState<LabelOption>("Home");
  const [newStreet, setNewStreet] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationType, setLocationType] = useState<string>("house");
  const [newFloor, setNewFloor] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [entrance, setEntrance] = useState<string>("");
  const [deliverySpot, setDeliverySpot] = useState<string>("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  // Search state
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectingPlace, setSelectingPlace] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setView(initialView);
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingAddress(null);
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
    setBuildingName("");
    setEntrance("");
    setDeliverySpot("");
    setDeliveryInstructions("");
  }

  function populateForm(addr: Address) {
    setNewLabel((addr.label as LabelOption) || "Home");
    setNewStreet(addr.street);
    setNewCity(addr.city ?? "");
    setNewLat(addr.lat);
    setNewLng(addr.lng);
    setLocationType(addr.locationType ?? "house");
    setNewFloor(addr.floor ?? "");
    setBuildingName(addr.companyName ?? "");
    setEntrance(addr.entrance ?? "");
    setDeliverySpot(addr.accessDetails ?? "");
    setDeliveryInstructions(addr.deliveryInstructions ?? "");
  }

  // Reset delivery spot when location type changes
  useEffect(() => {
    setDeliverySpot("");
  }, [locationType]);

  // Debounced place search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) { setPredictions([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(query, "address");
      setPredictions(results);
      setSearching(false);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setSelectingPlace(true);
    const details = await getPlaceDetails(prediction.place_id);
    setSelectingPlace(false);
    if (details) {
      const street = details.formatted_address.split(",").slice(0, 2).join(",").trim();
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
    if (!navigator.geolocation) { setLocationError(t("geolocationNotSupported")); return; }
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
              : data.display_name?.split(",").slice(0, 3).join(",") || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setNewStreet(displayAddress);
          setNewCity(data.address?.city || data.address?.town || data.address?.village || "");
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
          case error.PERMISSION_DENIED: setLocationError(t("locationDenied")); break;
          case error.POSITION_UNAVAILABLE: setLocationError(t("locationUnavailable")); break;
          default: setLocationError(t("locationError"));
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [t]);

  const handlePinMove = useCallback(async (lat: number, lng: number) => {
    setNewLat(lat);
    setNewLng(lng);
    const result = await reverseGeocode(lat, lng);
    if (result) { setNewStreet(result.street); setNewCity(result.city); }
  }, []);

  const createMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch(`/api/tenants/${tenant.slug}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(err?.error || t("saveFailed")); }
      const data = await res.json();
      return (data.address ?? data) as Address;
    },
    onSuccess: (created) => { addAddress(created); setSelectedAddress(created); setView("list"); resetForm(); },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: object }) => {
      const res = await fetch(`/api/tenants/${tenant.slug}/addresses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(err?.error || t("saveFailed")); }
      const data = await res.json();
      return (data.address ?? data) as Address;
    },
    onSuccess: (updated) => { updateAddress(updated.id, updated); setView("list"); resetForm(); },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenants/${tenant.slug}/addresses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return id;
    },
    onSuccess: (id) => { removeAddress(id); setView("list"); resetForm(); },
    onError: () => { toast.error(t("deleteFailed")); },
  });

  const buildBody = () => ({
    label: newLabel,
    street: newStreet.trim(),
    city: newCity.trim() || null,
    lat: newLat,
    lng: newLng,
    locationType: locationType || null,
    floor: newFloor.trim() || null,
    apartmentNumber: null,
    companyName: buildingName.trim() || null,
    entrance: entrance || null,
    accessDetails: deliverySpot || null,
    deliveryInstructions: deliveryInstructions.trim() || null,
  });

  const handleSave = () => {
    if (!newStreet.trim()) return;
    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, body: buildBody() });
    } else {
      createMutation.mutate(buildBody());
    }
  };

  const handleEditAddress = (addr: Address) => {
    setEditingAddress(addr);
    populateForm(addr);
    setView("form");
  };

  const handleSelectAddress = useCallback(
    (addr: Address) => { setSelectedAddress(addr); closeAll(); },
    [setSelectedAddress, closeAll]
  );

  const handleAddAddress = useCallback(() => {
    if (!session) { openDialog("auth"); } else { setView("search"); }
  }, [session, openDialog]);

  const handleBack = () => {
    if (view === "form") { resetForm(); setView(editingAddress ? "list" : "search"); }
    else if (view === "search") setView("list");
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const deliveryOptions = DELIVERY_SPOT_OPTIONS[locationType] ?? DELIVERY_SPOT_OPTIONS.house;

  return (
    <div className="flex flex-col overflow-y-auto flex-1">

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t("chooseAddress")}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0"><div className="px-3">
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
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelectAddress(addr); } }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl my-1 transition-all duration-300 cursor-pointer text-left ${isSelected ? "bg-primary/10" : "hover:bg-muted/50"}`}
                    >
                      <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {isSelected ? <Check className="size-4" /> : getAddressLabelIcon(addr.label, "size-4 text-muted-foreground")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[15px] text-foreground leading-tight">{addr.label || addr.street}</p>
                        <p className="text-[13px] text-muted-foreground mt-0.5 truncate">{addr.street}</p>
                        {addr.city && <p className="text-[12px] text-muted-foreground/70 truncate">{addr.city}</p>}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditAddress(addr); }}
                        className="size-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors duration-300 cursor-pointer shrink-0"
                        aria-label="Edit address"
                      >
                        <Pencil className="size-3.5 text-muted-foreground" />
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
                <p className="text-base font-semibold text-foreground mb-1">{t("noAddresses")}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{t("noAddressesDesc")}</p>
              </div>
            )}
          </div></ScrollArea>

          <div className="px-6 py-5 shrink-0">
            <AddButton variant="brand" onClick={handleAddAddress} className="w-full h-12 rounded-xl font-semibold text-[15px]">
              {t("addNewAddress")}
            </AddButton>
          </div>
        </>
      )}

      {/* ── SEARCH VIEW ── */}
      {view === "search" && (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t("addNewAddressTitle")}</DialogTitle>
          </DialogHeader>

          <div className="px-6 pt-4 pb-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-(--brand-primary,hsl(var(--ring))) transition-all duration-300"
                onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) { e.preventDefault(); setNewStreet(query.trim()); setView("form"); } }}
              />
              {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />}
            </div>
          </div>

          {predictions.length > 0 && (
            <div className="px-6 pb-2 max-h-48 overflow-y-auto">
              {selectingPlace ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : predictions.map((p) => (
                <button key={p.place_id} onClick={() => handleSelectPrediction(p)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors duration-300 cursor-pointer text-left">
                  <MapPin className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.structured_formatting.main_text}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.structured_formatting.secondary_text}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {locationError && <p className="text-xs text-destructive text-center px-6">{locationError}</p>}

          <div className="px-6 pb-6 pt-3">
            <Button variant="brand" onClick={handleUseCurrentLocation} disabled={locating}
              icon={<Crosshair className={`size-5 ${locating ? "animate-pulse" : ""}`} />}
              className="w-full h-12 rounded-xl font-semibold text-[15px]">
              {locating ? t("locating") : t("detectLocation")}
            </Button>
          </div>
        </>
      )}

      {/* ── FORM VIEW ── */}
      {view === "form" && (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingAddress ? t("editAddress") : t("confirmAddress")}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0"><div className="px-5 pb-6 space-y-5">

            {/* Section 1: Address details */}
            <SectionHeader
              title="Address details"
              subtitle="Add details to help the courier find you easily."
            />

            {/* Location type */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">{t("locationType")}</label>
              <Select value={locationType} onValueChange={setLocationType}>
                <SelectTrigger className="h-12 rounded-xl text-[15px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="house">
                    <div className="flex items-center gap-2"><Home className="size-4" />{t("house")}</div>
                  </SelectItem>
                  <SelectItem value="apartment">
                    <div className="flex items-center gap-2"><Building2 className="size-4" />{t("apartment")}</div>
                  </SelectItem>
                  <SelectItem value="office">
                    <div className="flex items-center gap-2"><Briefcase className="size-4" />{t("office")}</div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2"><MapPin className="size-4" />{t("otherType")}</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Street address */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">{t("streetAddress")}</label>
              <Input value={newStreet} onChange={(e) => setNewStreet(e.target.value)}
                placeholder={t("streetPlaceholder")} className="h-12 rounded-xl text-[15px]" />
            </div>

            {/* Building name */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">
                {locationType === "office" ? t("companyName") : "Building name"}
              </label>
              <Input value={buildingName} onChange={(e) => setBuildingName(e.target.value)}
                placeholder={locationType === "office" ? t("companyPlaceholder") : "e.g. Yuho Tower"}
                className="h-12 rounded-xl text-[15px]" />
            </div>

            {/* Floor + Entrance side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">{t("floor")}</label>
                <Input value={newFloor} onChange={(e) => setNewFloor(e.target.value)}
                  placeholder={t("floorPlaceholder")} className="h-12 rounded-xl text-[15px]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Entrance / Staircase</label>
                <Input value={entrance} onChange={(e) => setEntrance(e.target.value)}
                  placeholder="e.g. B" className="h-12 rounded-xl text-[15px]" />
              </div>
            </div>

            {/* Section 2: Where to leave */}
            <SectionHeader
              title="Where should we leave the delivery?"
              subtitle="Help the courier find you faster."
            />

            <div className="rounded-xl border border-border overflow-hidden">
              <RadioGroup value={deliverySpot} onValueChange={setDeliverySpot}>
                {deliveryOptions.map((opt, i) => (
                  <label
                    key={opt.value}
                    htmlFor={`spot-${opt.value}`}
                    className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/40 transition-colors duration-300 ${i < deliveryOptions.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <RadioGroupItem id={`spot-${opt.value}`} value={opt.value} />
                    <span className="text-[15px] text-foreground">{opt.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Map */}
            {newLat != null && newLng != null && (
              <div className="space-y-1">
                <AddressMap lat={newLat} lng={newLng} onPositionChange={handlePinMove} />
                <p className="text-xs text-muted-foreground text-center">{t("refinePin")}</p>
              </div>
            )}

            {/* Other instructions */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Other instructions for the courier</label>
              <Textarea value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)}
                placeholder={t("deliveryInstructionsPlaceholder")} rows={2}
                className="rounded-xl text-[15px] resize-none" />
            </div>

            {/* Section 3: Address label */}
            <SectionHeader
              title="Address label"
              subtitle="Labelling addresses helps you to choose between them. Choose 'Other' to create your own custom label."
            />

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
            <Button variant="brand" onClick={handleSave} disabled={!newStreet.trim()}
              loading={isSaving}
              icon={<Check className="size-4.5" />}
              className="w-full h-12 rounded-xl font-semibold text-[15px]">
              {isSaving ? t("saving") : editingAddress ? "Save changes" : t("saveAddress")}
            </Button>

            {/* Delete button — only when editing */}
            {editingAddress && (
              <Button
                variant="ghost"
                onClick={() => deleteMutation.mutate(editingAddress.id)}
                loading={deleteMutation.isPending}
                icon={<Trash2 className="size-4" />}
                className="w-full h-11 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete address"}
              </Button>
            )}
          </div></ScrollArea>
        </>
      )}
    </div>
  );
}
