"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Gift,
  Loader2,
  Pencil,
  Search,
  Ticket,
  Trash2,
  Users,
  UserSearch,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AddButton } from "@/components/add-button";
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
import { queryKeys } from "@/lib/query/keys";
import { useDialogStore } from "@/lib/stores/dialog-store";

interface CouponManagementProps {
  tenantId: string;
}

interface Coupon {
  id: string;
  code: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  name: string | null;
  description: string | null;
  minOrder: number | null;
  maxDiscount: number | null;
  expiresAt: string | null;
  isUsed: boolean;
  isActive: boolean;
  source: "MILESTONE" | "MANUAL";
  createdAt: string;
  customer: {
    id: string;
    user: { name: string | null; email: string };
  } | null;
}

interface CustomerGroup {
  id: string;
  name: string;
  discountType: "FIXED" | "PERCENTAGE" | null;
  discountValue: number | null;
  minOrder: number | null;
  maxDiscount: number | null;
  description: string | null;
  discountEnabled: boolean;
  _count: { members: number };
  createdAt: string;
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

  const [couponNoExpiry, setCouponNoExpiry] = useState(false);

  // Milestone no-expiry
  const [configNoExpiry, setConfigNoExpiry] = useState(false);

  // Customer groups management
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupDiscountType, setGroupDiscountType] = useState<
    "FIXED" | "PERCENTAGE"
  >("PERCENTAGE");
  const [groupDiscountValue, setGroupDiscountValue] = useState("");
  const [groupMinOrder, setGroupMinOrder] = useState("");
  const [groupMaxDiscount, setGroupMaxDiscount] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupDiscountEnabled, setGroupDiscountEnabled] = useState(false);
  const [groupCustomerSearch, setGroupCustomerSearch] = useState("");
  const [selectedGroupCustomerIds, setSelectedGroupCustomerIds] = useState<
    string[]
  >([]);
  const [groupSaving, setGroupSaving] = useState(false);

  // Edit mode: current members
  interface GroupMember {
    id: string;
    customer: { id: string; user: { name: string | null; email: string } };
  }
  const [editGroupMembers, setEditGroupMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberRemoving, setMemberRemoving] = useState<string | null>(null);

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

  // Redemption settings (generic, not milestone-specific)
  const [configMaxPerOrder, setConfigMaxPerOrder] = useState(1);
  const [configRedeemMinOrder, setConfigRedeemMinOrder] = useState("");
  const [redemptionSaving, setRedemptionSaving] = useState(false);

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
    setConfigNoExpiry(c.couponMilestoneNoExpiry || false);
    setConfigMaxPerOrder(c.couponMaxPerOrder || 1);
    setConfigRedeemMinOrder(
      c.couponRedeemMinOrder ? centsToEuros(c.couponRedeemMinOrder) : "",
    );
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

  const { data: customerGroups = [], isLoading: groupsLoading } = useQuery<
    CustomerGroup[]
  >({
    queryKey: queryKeys.customerGroups.all(tenantId),
    queryFn: async () => {
      const res = await fetch(`/api/admin/${tenantId}/customer-groups`);
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
    enabled: !!tenantId,
  });

  const { data: groupSearchCustomers = [] } = useQuery<CustomerSearchResult[]>({
    queryKey: ["admin-customers-search", tenantId, groupCustomerSearch],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/${tenantId}/customers?search=${encodeURIComponent(groupCustomerSearch)}&limit=10`,
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.customers || [];
    },
    enabled: !!tenantId && groupsOpen && groupCustomerSearch.length > 0,
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
          noExpiry: couponNoExpiry,
          validDays: couponNoExpiry ? undefined : couponValidDays,
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
            couponMilestoneNoExpiry: configNoExpiry,
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

  // Save redemption settings (separate from milestone config)
  const handleSaveRedemption = async () => {
    setRedemptionSaving(true);
    try {
      const res = await fetch(`/api/admin/${tenantId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            couponMaxPerOrder: configMaxPerOrder,
            couponRedeemMinOrder: configRedeemMinOrder
              ? eurosToCents(configRedeemMinOrder)
              : null,
          },
        }),
      });
      if (res.ok) {
        toast.success("Redemption settings saved");
        queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      } else {
        toast.error("Failed to save settings");
      }
    } finally {
      setRedemptionSaving(false);
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
    setCouponNoExpiry(false);
  };

  const resetGroupForm = () => {
    setEditGroupId(null);
    setNewGroupName("");
    setGroupDiscountType("PERCENTAGE");
    setGroupDiscountValue("");
    setGroupMinOrder("");
    setGroupMaxDiscount("");
    setGroupDescription("");
    setGroupDiscountEnabled(false);
    setGroupCustomerSearch("");
    setSelectedGroupCustomerIds([]);
    setEditGroupMembers([]);
  };

  const fetchGroupMembers = async (groupId: string) => {
    setMembersLoading(true);
    try {
      const res = await fetch(
        `/api/admin/${tenantId}/customer-groups/${groupId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setEditGroupMembers(data.members || []);
      }
    } finally {
      setMembersLoading(false);
    }
  };

  const handleRemoveMember = async (customerId: string) => {
    if (!editGroupId) return;
    setMemberRemoving(customerId);
    try {
      const res = await fetch(
        `/api/admin/${tenantId}/customer-groups/${editGroupId}/members`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId }),
        },
      );
      if (res.ok) {
        setEditGroupMembers((prev) =>
          prev.filter((m) => m.customer.id !== customerId),
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.customerGroups.all(tenantId) });
        toast.success("Member removed");
      } else {
        toast.error("Failed to remove member");
      }
    } finally {
      setMemberRemoving(null);
    }
  };

  const handleAddMembers = async (customerIds: string[]) => {
    if (!editGroupId || customerIds.length === 0) return;
    const res = await fetch(
      `/api/admin/${tenantId}/customer-groups/${editGroupId}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerIds }),
      },
    );
    if (res.ok) {
      await fetchGroupMembers(editGroupId);
      queryClient.invalidateQueries({ queryKey: queryKeys.customerGroups.all(tenantId) });
      setSelectedGroupCustomerIds([]);
      setGroupCustomerSearch("");
      toast.success("Members added");
    } else {
      toast.error("Failed to add members");
    }
  };

  const openEditGroup = (group: CustomerGroup) => {
    setEditGroupId(group.id);
    setNewGroupName(group.name);
    setGroupDiscountType(group.discountType || "PERCENTAGE");
    if (group.discountValue != null) {
      const val =
        group.discountType === "FIXED"
          ? centsToEuros(group.discountValue)
          : String(group.discountValue);
      setGroupDiscountValue(val);
    } else {
      setGroupDiscountValue("");
    }
    setGroupMinOrder(group.minOrder ? centsToEuros(group.minOrder) : "");
    setGroupMaxDiscount(
      group.maxDiscount ? centsToEuros(group.maxDiscount) : "",
    );
    setGroupDescription(group.description || "");
    setGroupDiscountEnabled(group.discountEnabled);
    setGroupsOpen(true);
    fetchGroupMembers(group.id);
  };

  const buildGroupDiscountPayload = () => {
    let parsedValue: number | undefined;
    if (groupDiscountEnabled && groupDiscountValue) {
      parsedValue =
        groupDiscountType === "FIXED"
          ? eurosToCents(groupDiscountValue)
          : parseInt(groupDiscountValue) || 0;
    }
    return {
      discountType: groupDiscountEnabled ? groupDiscountType : undefined,
      discountValue: parsedValue,
      minOrder: groupMinOrder ? eurosToCents(groupMinOrder) : null,
      maxDiscount: groupMaxDiscount ? eurosToCents(groupMaxDiscount) : null,
      description: groupDescription || null,
      discountEnabled: groupDiscountEnabled,
    };
  };

  const handleSaveGroup = async () => {
    if (!newGroupName.trim()) return;
    setGroupSaving(true);
    try {
      if (editGroupId) {
        // Update existing group
        const res = await fetch(
          `/api/admin/${tenantId}/customer-groups/${editGroupId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: newGroupName.trim(),
              ...buildGroupDiscountPayload(),
            }),
          },
        );
        if (res.ok) {
          toast.success("Group updated");
          queryClient.invalidateQueries({
            queryKey: queryKeys.customerGroups.all(tenantId),
          });
          setGroupsOpen(false);
          resetGroupForm();
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || "Failed to update group");
        }
      } else {
        // Create new group
        const res = await fetch(`/api/admin/${tenantId}/customer-groups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newGroupName.trim(),
            customerIds:
              selectedGroupCustomerIds.length > 0
                ? selectedGroupCustomerIds
                : undefined,
            ...buildGroupDiscountPayload(),
          }),
        });
        if (res.ok) {
          toast.success("Group created");
          queryClient.invalidateQueries({
            queryKey: queryKeys.customerGroups.all(tenantId),
          });
          setGroupsOpen(false);
          resetGroupForm();
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || "Failed to create group");
        }
      }
    } finally {
      setGroupSaving(false);
    }
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    openDialog(
      CONFIRM_DIALOG,
      {
        title: "Delete group",
        description: `This will delete "${groupName}" and remove its discount for all members.`,
        actionLabel: "Delete",
      },
      async () => {
        const res = await fetch(
          `/api/admin/${tenantId}/customer-groups/${groupId}`,
          {
            method: "DELETE",
          },
        );
        if (res.ok) {
          toast.success("Group deleted");
          queryClient.invalidateQueries({
            queryKey: queryKeys.customerGroups.all(tenantId),
          });
          queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
        } else {
          toast.error("Failed to delete group");
        }
      },
    );
  };

  const formatDiscount = (coupon: Coupon) =>
    coupon.type === "FIXED"
      ? `${centsToEuros(coupon.value)} EUR`
      : `${coupon.value}%`;

  const getSourceBadge = (source: Coupon["source"]) => {
    switch (source) {
      case "MILESTONE":
        return (
          <>
            <Gift className="size-3 mr-1" />
            Milestone
          </>
        );
      default:
        return (
          <>
            <UserSearch className="size-3 mr-1" />
            Manual
          </>
        );
    }
  };

  const formatGroupDiscount = (group: CustomerGroup) => {
    if (!group.discountType || !group.discountValue) return "No discount";
    const val =
      group.discountType === "FIXED"
        ? `${centsToEuros(group.discountValue)} EUR`
        : `${group.discountValue}%`;
    const min = group.minOrder
      ? ` (min ${centsToEuros(group.minOrder)} EUR)`
      : "";
    return `${val} off${min}`;
  };

  const getStatusBadge = (coupon: Coupon) => {
    if (coupon.isUsed) return <Badge variant="secondary">Used</Badge>;
    if (!coupon.isActive) return <Badge variant="destructive">Revoked</Badge>;
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date())
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
        <AddButton onClick={() => setCreateOpen(true)}>Create Coupon</AddButton>
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
                  <div className="flex items-center justify-between">
                    <Label>No expiry</Label>
                    <Switch
                      checked={configNoExpiry}
                      onCheckedChange={setConfigNoExpiry}
                    />
                  </div>
                  {!configNoExpiry && (
                    <>
                      <Label>Validity (days)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={configValidDays || ""}
                        onChange={(e) =>
                          setConfigValidDays(
                            e.target.value === ""
                              ? 0
                              : parseInt(e.target.value),
                          )
                        }
                      />
                    </>
                  )}
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
                .{" "}
                {configNoExpiry
                  ? "Coupons never expire."
                  : `Coupons expire after ${configValidDays} days.`}
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

      {/* Redemption Settings Card (generic, applies to all coupons) */}
      <Card>
        <CardHeader>
          <CardTitle>Redemption Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure how customers can redeem coupons at checkout. These
            settings apply to all coupon types (milestone and manual).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Max coupons per order</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={configMaxPerOrder || ""}
                onChange={(e) =>
                  setConfigMaxPerOrder(
                    e.target.value === "" ? 1 : parseInt(e.target.value),
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                How many coupons a customer can use in a single order.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Min order for coupon use (EUR)</Label>
              <Input
                type="number"
                min="0"
                step="0.50"
                placeholder="No minimum"
                value={configRedeemMinOrder}
                onChange={(e) => setConfigRedeemMinOrder(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to allow coupon use on any order amount.
              </p>
            </div>
          </div>
          <Button
            onClick={handleSaveRedemption}
            loading={redemptionSaving}
            className="w-full sm:w-auto"
          >
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Customer Discount Groups */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Customer Discount Groups</CardTitle>
            <AddButton
              size="sm"
              onClick={() => {
                resetGroupForm();
                setGroupsOpen(true);
              }}
            >
              Create Group
            </AddButton>
          </div>
        </CardHeader>
        <CardContent>
          {groupsLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!groupsLoading && customerGroups.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No discount groups yet. Create one to assign automatic discounts.
            </p>
          )}
          {!groupsLoading && customerGroups.length > 0 && (
            <div className="space-y-2">
              {customerGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Users className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group._count.members} member
                        {group._count.members !== 1 ? "s" : ""}
                        {" · "}
                        {group.discountEnabled ? (
                          <span className="text-green-600 dark:text-green-400">
                            {formatGroupDiscount(group)}
                          </span>
                        ) : (
                          "No discount"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => openEditGroup(group)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
                        {getSourceBadge(coupon.source)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {coupon.expiresAt
                        ? new Date(coupon.expiresAt).toLocaleDateString()
                        : "Never"}
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

            {/* Validity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>No expiry</Label>
                <Switch
                  checked={couponNoExpiry}
                  onCheckedChange={setCouponNoExpiry}
                />
              </div>
              {!couponNoExpiry && (
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
              )}
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

      {/* Create / Edit Group Sheet */}
      <Sheet
        open={groupsOpen}
        onOpenChange={(open) => {
          setGroupsOpen(open);
          if (!open) resetGroupForm();
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editGroupId ? "Edit Discount Group" : "Create Discount Group"}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Family, Employees"
                maxLength={100}
              />
            </div>

            <Separator />

            {/* Discount Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Enable discount</Label>
                <Switch
                  checked={groupDiscountEnabled}
                  onCheckedChange={setGroupDiscountEnabled}
                />
              </div>

              {groupDiscountEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={groupDiscountType}
                        onValueChange={(v) =>
                          setGroupDiscountType(v as "FIXED" | "PERCENTAGE")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIXED">Fixed (EUR)</SelectItem>
                          <SelectItem value="PERCENTAGE">
                            Percentage (%)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Value</Label>
                      <Input
                        type="number"
                        min="0"
                        step={groupDiscountType === "FIXED" ? "0.50" : "1"}
                        value={groupDiscountValue}
                        onChange={(e) => setGroupDiscountValue(e.target.value)}
                        placeholder={
                          groupDiscountType === "FIXED" ? "2.00" : "10"
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Min order (EUR)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.50"
                        value={groupMinOrder}
                        onChange={(e) => setGroupMinOrder(e.target.value)}
                        placeholder="None"
                      />
                    </div>
                    {groupDiscountType === "PERCENTAGE" && (
                      <div className="space-y-2">
                        <Label>Max discount (EUR)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.50"
                          value={groupMaxDiscount}
                          onChange={(e) => setGroupMaxDiscount(e.target.value)}
                          placeholder="No cap"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                      placeholder="e.g., Employee discount"
                      maxLength={200}
                    />
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Current members (edit mode) */}
            {editGroupId && (
              <div className="space-y-2">
                <Label>Members</Label>
                {membersLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!membersLoading && editGroupMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">
                    No members yet.
                  </p>
                )}

                {!membersLoading && editGroupMembers.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {editGroupMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {m.customer.user.name || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {m.customer.user.email}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleRemoveMember(m.customer.id)}
                          disabled={memberRemoving === m.customer.id}
                        >
                          {memberRemoving === m.customer.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <X className="size-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add members */}
            <div className="space-y-2">
              <Label>
                {editGroupId ? "Add Members" : "Add Members (optional)"}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={groupCustomerSearch}
                  onChange={(e) => setGroupCustomerSearch(e.target.value)}
                  placeholder="Search customers..."
                  className="pl-10"
                />
              </div>
              {groupSearchCustomers.length > 0 && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {groupSearchCustomers
                    .filter(
                      (c) =>
                        !editGroupMembers.some((m) => m.customer.id === c.id),
                    )
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedGroupCustomerIds((prev) =>
                            prev.includes(c.id)
                              ? prev.filter((id) => id !== c.id)
                              : [...prev, c.id],
                          );
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${
                          selectedGroupCustomerIds.includes(c.id)
                            ? "bg-muted"
                            : ""
                        }`}
                      >
                        <p className="font-medium">{c.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.email}
                        </p>
                      </button>
                    ))}
                </div>
              )}
              {selectedGroupCustomerIds.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {selectedGroupCustomerIds.length} customer
                    {selectedGroupCustomerIds.length !== 1 ? "s" : ""} selected
                  </p>
                  {editGroupId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddMembers(selectedGroupCustomerIds)}
                    >
                      Add to Group
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleSaveGroup}
              disabled={!newGroupName.trim()}
              loading={groupSaving}
            >
              {editGroupId ? "Save Changes" : "Create Group"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
