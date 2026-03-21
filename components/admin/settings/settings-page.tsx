"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, QrCode, Save } from "lucide-react";
import { useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect,useState } from "react";
import { toast } from "sonner";

import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { centsToEuros, eurosToCents } from "@/lib/general/formatters";
import { queryKeys } from "@/lib/query/keys";

interface OperatingHourData {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface ConfigData {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  currency: string;
  loyaltyEnabled: boolean;
  loyaltyRequiredOrders: number;
  loyaltyRewardAmount: number;
}

interface TenantSettings {
  id: string;
  name: string;
  isPaused: boolean;
  prepTimeMinutes: number;
  minOrderAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  taxRate: number;
  config: ConfigData | null;
  operatingHours: OperatingHourData[];
}

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Map display index to dayOfWeek (Monday=1, ..., Saturday=6, Sunday=0)
const DAY_OF_WEEK_MAP = [1, 2, 3, 4, 5, 6, 0];

function getDefaultOperatingHours(): OperatingHourData[] {
  return DAY_OF_WEEK_MAP.map((dow) => ({
    dayOfWeek: dow,
    openTime: "09:00",
    closeTime: "22:00",
    isClosed: false,
  }));
}

function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-5 w-72" />
      </div>
      <div className="grid gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SettingsPage({ tenantId }: { tenantId: string }) {
  const tenant = useTenant();
  const resolvedTenantId = tenantId || tenant.id;
  const queryClient = useQueryClient();
  const qrRef = useRef<HTMLDivElement>(null);

  const storeUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${tenant.slug}.${window.location.host.replace(/^[^.]+\./, "")}/order`
    : `https://${tenant.slug}.example.com/order`;

  const downloadQr = useCallback(() => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const canvas = document.createElement("canvas");
    const size = 720;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const pad = 40;
      ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
      const a = document.createElement("a");
      a.download = `${tenant.slug}-qr-code.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
  }, [tenant.slug]);

  // Form state
  const [name, setName] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(15);
  const [minOrderAmount, setMinOrderAmount] = useState("0.00");
  const [deliveryFee, setDeliveryFee] = useState("0.00");
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState("0.00");
  const [taxRate, setTaxRate] = useState(0);
  const [operatingHours, setOperatingHours] = useState<OperatingHourData[]>(
    getDefaultOperatingHours()
  );
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [secondaryColor, setSecondaryColor] = useState("#000000");
  const [accentColor, setAccentColor] = useState("#000000");
  const [currency, setCurrency] = useState("EUR");
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [loyaltyRequiredOrders, setLoyaltyRequiredOrders] = useState(10);
  const [loyaltyRewardAmount, setLoyaltyRewardAmount] = useState("5.00");

  const { data: settings, isLoading } = useQuery<TenantSettings>({
    queryKey: queryKeys.settings.all(resolvedTenantId),
    queryFn: async () => {
      const res = await fetch(`/api/admin/${resolvedTenantId}/settings`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    enabled: !!resolvedTenantId,
  });

  useEffect(() => {
    if (!settings) return;

    setName(settings.name || "");
    setIsPaused(settings.isPaused || false);
    setPrepTimeMinutes(settings.prepTimeMinutes || 15);
    setMinOrderAmount(centsToEuros(settings.minOrderAmount || 0));
    setDeliveryFee(centsToEuros(settings.deliveryFee || 0));
    setFreeDeliveryThreshold(
      centsToEuros(settings.freeDeliveryThreshold || 0)
    );
    setTaxRate(settings.taxRate || 0);

    if (settings.config) {
      setPrimaryColor(settings.config.primaryColor || "#000000");
      setSecondaryColor(settings.config.secondaryColor || "#000000");
      setAccentColor(settings.config.accentColor || "#000000");
      setCurrency(settings.config.currency || "EUR");
      setLoyaltyEnabled(settings.config.loyaltyEnabled || false);
      setLoyaltyRequiredOrders(settings.config.loyaltyRequiredOrders || 10);
      setLoyaltyRewardAmount(
        centsToEuros(settings.config.loyaltyRewardAmount || 500)
      );
    }

    if (settings.operatingHours && settings.operatingHours.length > 0) {
      // Build a complete set of 7 days, filling in defaults for missing days
      const hoursMap = new Map(
        settings.operatingHours.map((h) => [h.dayOfWeek, h])
      );
      const merged = DAY_OF_WEEK_MAP.map((dow) => {
        const existing = hoursMap.get(dow);
        return existing
          ? {
              dayOfWeek: existing.dayOfWeek,
              openTime: existing.openTime,
              closeTime: existing.closeTime,
              isClosed: existing.isClosed,
            }
          : {
              dayOfWeek: dow,
              openTime: "09:00",
              closeTime: "22:00",
              isClosed: false,
            };
      });
      setOperatingHours(merged);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/${resolvedTenantId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          isPaused,
          prepTimeMinutes,
          minOrderAmount: eurosToCents(minOrderAmount),
          deliveryFee: eurosToCents(deliveryFee),
          freeDeliveryThreshold: eurosToCents(freeDeliveryThreshold),
          taxRate,
          config: {
            primaryColor,
            secondaryColor,
            accentColor,
            currency,
            loyaltyEnabled,
            loyaltyRequiredOrders,
            loyaltyRewardAmount: eurosToCents(loyaltyRewardAmount),
          },
          operatingHours,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save settings");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Settings saved successfully");
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.all(resolvedTenantId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  const updateOperatingHour = (
    index: number,
    field: keyof OperatingHourData,
    value: string | boolean
  ) => {
    setOperatingHours((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your store configuration, operating hours, and branding.
        </p>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input
                id="store-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your store name"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="store-paused" className="text-sm font-medium">
                  Store Paused
                </Label>
                <p className="text-sm text-muted-foreground">
                  When paused, customers cannot place orders
                </p>
              </div>
              <Switch
                id="store-paused"
                checked={isPaused}
                onCheckedChange={setIsPaused}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="prep-time">Prep Time (minutes)</Label>
              <Input
                id="prep-time"
                type="number"
                min={0}
                value={prepTimeMinutes}
                onChange={(e) =>
                  setPrepTimeMinutes(parseInt(e.target.value) || 0)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Order Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="min-order">Minimum Order Amount (EUR)</Label>
              <Input
                id="min-order"
                type="number"
                min={0}
                step="0.01"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tax-rate">Tax Rate (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Operating Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {operatingHours.map((hour, index) => (
              <div
                key={hour.dayOfWeek}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
              >
                <span className="w-24 text-sm font-medium">
                  {DAY_NAMES[index]}
                </span>

                <div className="flex items-center gap-2">
                  <Switch
                    id={`closed-${hour.dayOfWeek}`}
                    checked={hour.isClosed}
                    onCheckedChange={(checked) =>
                      updateOperatingHour(index, "isClosed", checked)
                    }
                  />
                  <Label
                    htmlFor={`closed-${hour.dayOfWeek}`}
                    className="text-sm text-muted-foreground"
                  >
                    Closed
                  </Label>
                </div>

                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="time"
                    value={hour.openTime}
                    onChange={(e) =>
                      updateOperatingHour(index, "openTime", e.target.value)
                    }
                    disabled={hour.isClosed}
                    className="w-auto"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={hour.closeTime}
                    onChange={(e) =>
                      updateOperatingHour(index, "closeTime", e.target.value)
                    }
                    disabled={hour.isClosed}
                    className="w-auto"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Brand Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Colors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="accent-color">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="EUR"
                className="w-32"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loyalty Program */}
      <Card>
        <CardHeader>
          <CardTitle>Loyalty Program</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable loyalty program</Label>
              <p className="text-sm text-muted-foreground">
                Reward customers after a number of orders
              </p>
            </div>
            <Switch
              checked={loyaltyEnabled}
              onCheckedChange={setLoyaltyEnabled}
            />
          </div>
          {loyaltyEnabled && (
            <>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Orders required for reward</Label>
                  <Input
                    type="number"
                    min={2}
                    max={50}
                    value={loyaltyRequiredOrders}
                    onChange={(e) =>
                      setLoyaltyRequiredOrders(parseInt(e.target.value) || 10)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reward amount (EUR)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.50"
                    value={loyaltyRewardAmount}
                    onChange={(e) => setLoyaltyRewardAmount(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Customers earn &euro;{loyaltyRewardAmount} off after every{" "}
                {loyaltyRequiredOrders} completed orders.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* QR Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="size-5" />
            QR Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Print this QR code so customers can scan it to open your store and install the app on their phone.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div
              ref={qrRef}
              className="bg-white p-4 rounded-xl border shadow-sm"
            >
              <QRCodeSVG
                value={storeUrl}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="flex flex-col gap-2 text-center sm:text-left">
              <p className="text-xs text-muted-foreground break-all">{storeUrl}</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={downloadQr}
              >
                <Download className="size-4" />
                Download PNG
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="gap-2"
        >
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
