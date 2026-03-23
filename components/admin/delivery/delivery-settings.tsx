"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { centsToDecimal, decimalToCents } from "@/lib/general/formatters";

interface DeliveryData {
  deliveryEnabled: boolean;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  deliveryRangeKm: number;
  minOrderAmount: number;
  storeLat: number | null;
  storeLng: number | null;
}

interface DeliverySettingsProps {
  tenantId: string;
}

export function DeliverySettings({ tenantId }: DeliverySettingsProps) {
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("0.00");
  const [freeThreshold, setFreeThreshold] = useState("0.00");
  const [rangeKm, setRangeKm] = useState("5");
  const [minOrder, setMinOrder] = useState("0.00");
  const [storeLat, setStoreLat] = useState("");
  const [storeLng, setStoreLng] = useState("");

  const { data, isLoading } = useQuery<DeliveryData>({
    queryKey: ["delivery-settings", tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/${tenantId}/settings`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!data) return;
    setEnabled(data.deliveryEnabled || false);
    setDeliveryFee(centsToDecimal(data.deliveryFee || 0));
    setFreeThreshold(centsToDecimal(data.freeDeliveryThreshold || 0));
    setRangeKm(String(data.deliveryRangeKm || 5));
    setMinOrder(centsToDecimal(data.minOrderAmount || 0));
    setStoreLat(data.storeLat != null ? String(data.storeLat) : "");
    setStoreLng(data.storeLng != null ? String(data.storeLng) : "");
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/${tenantId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryEnabled: enabled,
          deliveryFee: decimalToCents(deliveryFee),
          freeDeliveryThreshold: decimalToCents(freeThreshold),
          deliveryRangeKm: parseFloat(rangeKm) || 5,
          minOrderAmount: decimalToCents(minOrder),
          storeLat: storeLat ? parseFloat(storeLat) : null,
          storeLng: storeLng ? parseFloat(storeLng) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Delivery settings saved");
      queryClient.invalidateQueries({ queryKey: ["delivery-settings", tenantId] });
    },
    onError: () => {
      toast.error("Failed to save delivery settings");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Delivery</h1>
        <p className="text-muted-foreground">
          Configure delivery options for your store.
        </p>
      </div>

      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
                <Truck className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Enable Delivery</CardTitle>
                <CardDescription>
                  Allow customers to order delivery to their address
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Delivery Configuration */}
      <Card className={!enabled ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-blue-500/10">
              <MapPin className="size-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-base">Delivery Area</CardTitle>
              <CardDescription>
                Set the maximum delivery range from your store
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="range-km">Delivery Range (km)</Label>
            <Input
              id="range-km"
              type="number"
              min={0.5}
              max={50}
              step="0.5"
              value={rangeKm}
              onChange={(e) => setRangeKm(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Customers within this radius can order delivery.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Store Location */}
      <Card className={!enabled ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-green-500/10">
              <MapPin className="size-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-base">Store Location</CardTitle>
              <CardDescription>
                Set your store coordinates for delivery zone validation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="store-lat">Store Latitude</Label>
            <Input
              id="store-lat"
              type="number"
              step="any"
              placeholder="e.g. 37.9838"
              value={storeLat}
              onChange={(e) => setStoreLat(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="store-lng">Store Longitude</Label>
            <Input
              id="store-lng"
              type="number"
              step="any"
              placeholder="e.g. 23.7275"
              value={storeLng}
              onChange={(e) => setStoreLng(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Required for delivery zone validation. You can find coordinates from Google Maps.
          </p>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className={!enabled ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="text-base">Delivery Pricing</CardTitle>
          <CardDescription>
            Set fees and thresholds for delivery orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="delivery-fee">Delivery Fee (EUR)</Label>
            <Input
              id="delivery-fee"
              type="number"
              min={0}
              step="0.01"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="free-threshold">Free Delivery Threshold (EUR)</Label>
            <Input
              id="free-threshold"
              type="number"
              min={0}
              step="0.01"
              value={freeThreshold}
              onChange={(e) => setFreeThreshold(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Orders above this amount get free delivery. Set to 0 to disable.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="min-order-delivery">Minimum Order for Delivery (EUR)</Label>
            <Input
              id="min-order-delivery"
              type="number"
              min={0}
              step="0.01"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Minimum order amount required for delivery orders.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="cursor-pointer"
        >
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
