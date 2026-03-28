"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, QrCode, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useRef } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { TableQrGenerator } from "@/components/admin/settings/table-qr-generator";
import { ImageUpload } from "@/components/image-upload";
import { useTenant } from "@/components/tenant-provider";

const QRCodeSVG = dynamic(() =>
  import("qrcode.react").then((m) => m.QRCodeSVG),
  { ssr: false, loading: () => <div className="size-48 animate-pulse bg-muted rounded" /> }
);
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  logo: string | null;
  coverImage: string | null;
  couponEnabled: boolean;
  couponMilestoneOrders: number;
  couponType: "FIXED" | "PERCENTAGE";
  couponValue: number;
  couponValidDays: number;
  couponMinOrder: number | null;
  couponMaxDiscount: number | null;
  couponMaxSavingsPerOrder: number | null;
  couponMaxPerOrder: number;
  couponRedeemMinOrder: number | null;
  couponDescription: string | null;
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

// Generate time options in 30-minute intervals
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

function TimeSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-25">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-60 overflow-y-auto">
        {TIME_OPTIONS.map((t) => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
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
    : `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/order`;

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
  const [couponEnabled, setCouponEnabled] = useState(false);
  const [couponMilestoneOrders, setCouponMilestoneOrders] = useState(10);
  const [couponType, setCouponType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [couponValue, setCouponValue] = useState("5.00");
  const [couponValidDays, setCouponValidDays] = useState(30);
  const [couponMinOrder, setCouponMinOrder] = useState("");
  const [couponMaxDiscount, setCouponMaxDiscount] = useState("");
  const [couponMaxSavingsPerOrder, setCouponMaxSavingsPerOrder] = useState("");
  const [couponMaxPerOrder, setCouponMaxPerOrder] = useState(1);
  const [couponRedeemMinOrder, setCouponRedeemMinOrder] = useState("");
  const [couponDescription, setCouponDescription] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);

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
      setCouponEnabled(settings.config.couponEnabled || false);
      setCouponMilestoneOrders(settings.config.couponMilestoneOrders || 10);
      setCouponType(settings.config.couponType || "FIXED");
      setCouponValue(centsToEuros(settings.config.couponValue || 500));
      setCouponValidDays(settings.config.couponValidDays || 30);
      setCouponMinOrder(settings.config.couponMinOrder ? centsToEuros(settings.config.couponMinOrder) : "");
      setCouponMaxDiscount(settings.config.couponMaxDiscount ? centsToEuros(settings.config.couponMaxDiscount) : "");
      setCouponMaxSavingsPerOrder(settings.config.couponMaxSavingsPerOrder ? centsToEuros(settings.config.couponMaxSavingsPerOrder) : "");
      setCouponMaxPerOrder(settings.config.couponMaxPerOrder || 1);
      setCouponRedeemMinOrder(settings.config.couponRedeemMinOrder ? centsToEuros(settings.config.couponRedeemMinOrder) : "");
      setCouponDescription(settings.config.couponDescription || "");
      setLogo(settings.config.logo || null);
      setCoverImage(settings.config.coverImage || null);
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
            logo,
            coverImage,
            couponEnabled,
            couponMilestoneOrders,
            couponType,
            couponValue: eurosToCents(couponValue),
            couponValidDays,
            couponMinOrder: couponMinOrder ? eurosToCents(couponMinOrder) : null,
            couponMaxDiscount: couponMaxDiscount ? eurosToCents(couponMaxDiscount) : null,
            couponMaxSavingsPerOrder: couponMaxSavingsPerOrder ? eurosToCents(couponMaxSavingsPerOrder) : null,
            couponMaxPerOrder,
            couponRedeemMinOrder: couponRedeemMinOrder ? eurosToCents(couponRedeemMinOrder) : null,
            couponDescription: couponDescription || null,
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

  // Immediately persist a branding image change to the DB (no need to click Save)
  const saveBrandingImage = async (field: "logo" | "coverImage", url: string | null) => {
    try {
      const res = await fetch(`/api/admin/${resolvedTenantId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { [field]: url } }),
      });
      if (!res.ok) throw new Error("Failed to save");
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.all(resolvedTenantId),
      });
    } catch {
      toast.error("Failed to save image");
    }
  };

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
                min={1}
                value={prepTimeMinutes || ""}
                onChange={(e) =>
                  setPrepTimeMinutes(e.target.value === "" ? 0 : parseInt(e.target.value))
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
                value={taxRate || ""}
                onChange={(e) => setTaxRate(e.target.value === "" ? 0 : parseFloat(e.target.value))}
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
                  <TimeSelect
                    value={hour.openTime}
                    onChange={(val) =>
                      updateOperatingHour(index, "openTime", val)
                    }
                    disabled={hour.isClosed}
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <TimeSelect
                    value={hour.closeTime}
                    onChange={(val) =>
                      updateOperatingHour(index, "closeTime", val)
                    }
                    disabled={hour.isClosed}
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

        {/* Branding Images */}
        <Card>
          <CardHeader>
            <CardTitle>Branding Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Main Logo</Label>
              <p className="text-sm text-muted-foreground">
                Used in the header and order pages.
              </p>
              <ImageUpload
                value={logo}
                onChange={(url) => {
                  const val = url || null;
                  setLogo(val);
                  saveBrandingImage("logo", val);
                }}
                uploadUrl={`/api/admin/${resolvedTenantId}/upload`}
                imageType="logo"
                aspectRatio={1}
              />
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label>Cover Image</Label>
              <p className="text-sm text-muted-foreground">
                Used as a banner or background image.
              </p>
              <ImageUpload
                value={coverImage}
                onChange={(url) => {
                  const val = url || null;
                  setCoverImage(val);
                  saveBrandingImage("coverImage", val);
                }}
                uploadUrl={`/api/admin/${resolvedTenantId}/upload`}
                imageType="cover"
                aspectRatio={16 / 9}
              />
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Table QR Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="size-5" />
            Table QR Codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Generate QR codes for each table. Customers scan the code to go directly to the ordering page with their table pre-selected.
          </p>
          <TableQrGenerator />
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
