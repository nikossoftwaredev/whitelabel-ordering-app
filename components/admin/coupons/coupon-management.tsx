"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Gift,
  Loader2,
  Plus,
  Search,
  Ticket,
  Trash2,
  UserSearch,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CONFIRM_DIALOG } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { centsToEuros, eurosToCents } from "@/lib/general/formatters";
import { useDialogStore } from "@/lib/stores/dialog-store";

interface CouponManagementProps {
  tenantId: string;
}

interface Coupon {
  id: string;
  code: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  description: string | null;
  minOrder: number | null;
  maxDiscount: number | null;
  expiresAt: string;
  isUsed: boolean;
  isActive: boolean;
  source: "MILESTONE" | "MANUAL";
  createdAt: string;
  customer: {
    id: string;
    user: { name: string | null; email: string };
  };
}

// Flattened shape from the customers API
interface CustomerSearchResult {
  id: string;
  name: string | null;
  email: string;
}

export function CouponManagement({ tenantId }: CouponManagementProps) {
  const queryClient = useQueryClient();
  const openDialog = useDialogStore((s) => s.openDialog);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("available");
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [couponType, setCouponType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [couponValue, setCouponValue] = useState("5.00");
  const [couponDescription, setCouponDescription] = useState("");
  const [couponValidDays, setCouponValidDays] = useState(30);
  const [couponMinOrder, setCouponMinOrder] = useState("");
  const [couponMaxDiscount, setCouponMaxDiscount] = useState("");

  // Milestone config state
  const [configEnabled, setConfigEnabled] = useState(false);
  const [configMilestoneType, setConfigMilestoneType] = useState<
    "ORDERS" | "SPENDING"
  >("ORDERS");
  const [configMilestoneOrders, setConfigMilestoneOrders] = useState(10);
  const [configMilestoneSpent, setConfigMilestoneSpent] = useState("30.00");
  const [configType, setConfigType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [configValue, setConfigValue] = useState("5.00");
  const [configValidDays, setConfigValidDays] = useState(30);
  const [configSaving, setConfigSaving] = useState(false);

  // Fetch coupons
  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ["admin-coupons", tenantId, statusFilter],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/${tenantId}/coupons?status=${statusFilter}`,
      );
      if (!res.ok) throw new Error("Failed to fetch coupons");
      return res.json();
    },
    enabled: !!tenantId,
  });

  // Fetch settings to populate milestone config
  const { data: settingsData } = useQuery({
    queryKey: ["admin-settings", tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/${tenantId}/settings`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!settingsData?.config) return;
    const c = settingsData.config;
    setConfigEnabled(c.couponEnabled || false);
    setConfigMilestoneType(c.couponMilestoneType || "ORDERS");
    setConfigMilestoneOrders(c.couponMilestoneOrders || 10);
    setConfigMilestoneSpent(centsToEuros(c.couponMilestoneSpent || 3000));
    setConfigType(c.couponType || "FIXED");
    setConfigValue(
      c.couponType === "PERCENTAGE"
        ? String(c.couponValue || 10)
        : centsToEuros(c.couponValue || 500),
    );
    setConfigValidDays(c.couponValidDays || 30);
  }, [settingsData]);

  // Fetch customers for the create sheet (flattened API shape)
  const { data: customers = [] } = useQuery<CustomerSearchResult[]>({
    queryKey: ["admin-customers-search", tenantId, customerSearch],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/${tenantId}/customers?search=${encodeURIComponent(customerSearch)}&limit=10`,
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.customers || [];
    },
    enabled: !!tenantId && createOpen && customerSearch.length > 0,
  });

  // Create coupon mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/${tenantId}/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          type: couponType,
          value:
            couponType === "FIXED"
              ? eurosToCents(couponValue)
              : parseInt(couponValue),
          description: couponDescription || undefined,
          validDays: couponValidDays,
          minOrder: couponMinOrder ? eurosToCents(couponMinOrder) : undefined,
          maxDiscount: couponMaxDiscount
            ? eurosToCents(couponMaxDiscount)
            : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create coupon");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Coupon created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setCreateOpen(false);
      resetCreateForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Revoke coupon mutation
  const revokeMutation = useMutation({
    mutationFn: async (couponId: string) => {
      const res = await fetch(`/api/admin/${tenantId}/coupons/${couponId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to revoke coupon");
      }
    },
    onSuccess: () => {
      toast.success("Coupon revoked");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Save milestone config
  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      const res = await fetch(`/api/admin/${tenantId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            couponEnabled: configEnabled,
            couponMilestoneType: configMilestoneType,
            couponMilestoneOrders: configMilestoneOrders,
            couponMilestoneSpent: eurosToCents(configMilestoneSpent),
            couponType: configType,
            couponValue:
              configType === "FIXED"
                ? eurosToCents(configValue)
                : parseInt(configValue) || 0,
            couponValidDays: configValidDays,
          },
        }),
      });
      if (res.ok) {
        toast.success("Settings saved");
        queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      } else {
        toast.error("Failed to save settings");
      }
    } finally {
      setConfigSaving(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedCustomerId("");
    setCustomerSearch("");
    setCouponType("FIXED");
    setCouponValue("5.00");
    setCouponDescription("");
    setCouponValidDays(30);
    setCouponMinOrder("");
    setCouponMaxDiscount("");
  };

  const formatDiscount = (coupon: Coupon) =>
    coupon.type === "FIXED"
      ? `${centsToEuros(coupon.value)} EUR`
      : `${coupon.value}%`;

  const getStatusBadge = (coupon: Coupon) => {
    if (coupon.isUsed) return <Badge variant="secondary">Used</Badge>;
    if (!coupon.isActive) return <Badge variant="destructive">Revoked</Badge>;
    if (new Date(coupon.expiresAt) < new Date())
      return <Badge variant="outline">Expired</Badge>;
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        Active
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Coupons</h2>
          <p className="text-muted-foreground">
            Manage customer coupons and milestone rewards
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Create Coupon
        </Button>
      </div>

      {/* Milestone Settings Card (toggle + config) */}
      <Card>
        <CardHeader>
          <CardTitle>Milestone Rewards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable automatic coupons</Label>
              <p className="text-sm text-muted-foreground">
                Reward customers with coupons after milestones
              </p>
            </div>
            <Switch
              checked={configEnabled}
              onCheckedChange={setConfigEnabled}
            />
          </div>
          {configEnabled && (
            <>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Milestone trigger</Label>
                  <Select
                    value={configMilestoneType}
                    onValueChange={(v) =>
                      setConfigMilestoneType(v as "ORDERS" | "SPENDING")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ORDERS">Number of orders</SelectItem>
                      <SelectItem value="SPENDING">
                        Total amount spent
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {configMilestoneType === "ORDERS" ? (
                  <div className="space-y-2">
                    <Label>Orders required for coupon</Label>
                    <Input
                      type="number"
                      min={2}
                      max={100}
                      value={configMilestoneOrders || ""}
                      onChange={(e) =>
                        setConfigMilestoneOrders(
                          e.target.value === "" ? 0 : parseInt(e.target.value),
                        )
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Spending threshold (EUR)</Label>
                    <Input
                      type="number"
                      min="1"
                      step="0.50"
                      value={configMilestoneSpent}
                      onChange={(e) => setConfigMilestoneSpent(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Coupon type</Label>
                  <Select
                    value={configType}
                    onValueChange={(v) =>
                      setConfigType(v as "FIXED" | "PERCENTAGE")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">Fixed amount (EUR)</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {configType === "FIXED"
                      ? "Coupon value (EUR)"
                      : "Coupon percentage (%)"}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step={configType === "FIXED" ? "0.50" : "1"}
                    value={configValue}
                    onChange={(e) => setConfigValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Validity (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={configValidDays || ""}
                    onChange={(e) =>
                      setConfigValidDays(
                        e.target.value === "" ? 0 : parseInt(e.target.value),
                      )
                    }
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Customers earn a{" "}
                {configType === "FIXED"
                  ? `\u20AC${configValue}`
                  : `${configValue}%`}{" "}
                coupon after every{" "}
                {configMilestoneType === "ORDERS"
                  ? `${configMilestoneOrders} completed orders`
                  : `\u20AC${configMilestoneSpent} spent`}
                . Coupons expire after {configValidDays} days.
              </p>
              <Button
                onClick={handleSaveConfig}
                loading={configSaving}
                className="w-full sm:w-auto"
              >
                Save Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Coupon List */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">All Coupons</h3>
        <div className="flex gap-2">
          {(["available", "used", "expired"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="capitalize"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && coupons.length === 0 && (
            <EmptyState
              icon={Ticket}
              title={`No ${statusFilter} coupons`}
              description="Coupons will appear here when created manually or earned through milestones."
            />
          )}
          {!isLoading && coupons.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <code className="font-mono text-sm font-semibold">
                        {coupon.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {coupon.customer?.user?.name || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {coupon.customer?.user?.email || "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatDiscount(coupon)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {coupon.source === "MILESTONE" ? (
                          <>
                            <Gift className="size-3 mr-1" />
                            Milestone
                          </>
                        ) : (
                          <>
                            <UserSearch className="size-3 mr-1" />
                            Manual
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(coupon.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(coupon)}</TableCell>
                    <TableCell>
                      {!coupon.isUsed && coupon.isActive && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            openDialog(CONFIRM_DIALOG, {
                              title: "Revoke coupon",
                              description: `This will deactivate coupon ${coupon.code}. The customer will no longer be able to use it.`,
                              onConfirm: () => revokeMutation.mutate(coupon.id),
                            })
                          }
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Coupon Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create Coupon</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            {/* Customer search */}
            <div className="space-y-2">
              <Label>Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="pl-10"
                />
              </div>
              {customers.length > 0 && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomerSearch(c.name || c.email);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${
                        selectedCustomerId === c.id ? "bg-muted" : ""
                      }`}
                    >
                      <p className="font-medium">{c.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Type + Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={couponType}
                  onValueChange={(v) =>
                    setCouponType(v as "FIXED" | "PERCENTAGE")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed (EUR)</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  min="0"
                  step={couponType === "FIXED" ? "0.50" : "1"}
                  value={couponValue}
                  onChange={(e) => setCouponValue(e.target.value)}
                />
              </div>
            </div>

            {/* Valid days */}
            <div className="space-y-2">
              <Label>Validity (days)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={couponValidDays}
                onChange={(e) =>
                  setCouponValidDays(parseInt(e.target.value) || 30)
                }
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={couponDescription}
                onChange={(e) => setCouponDescription(e.target.value)}
                placeholder="e.g., Birthday gift"
                maxLength={200}
              />
            </div>

            {/* Min order + Max discount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min order (EUR)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.50"
                  value={couponMinOrder}
                  onChange={(e) => setCouponMinOrder(e.target.value)}
                  placeholder="None"
                />
              </div>
              {couponType === "PERCENTAGE" && (
                <div className="space-y-2">
                  <Label>Max discount (EUR)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.50"
                    value={couponMaxDiscount}
                    onChange={(e) => setCouponMaxDiscount(e.target.value)}
                    placeholder="No cap"
                  />
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={() => createMutation.mutate()}
              disabled={!selectedCustomerId || !couponValue}
              loading={createMutation.isPending}
            >
              Create Coupon
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
