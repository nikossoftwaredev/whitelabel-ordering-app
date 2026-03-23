"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Copy,
  Loader2,
  Percent,
  Plus,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
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
import { useFormatPrice } from "@/hooks/use-format-price";
import { decimalToCents, formatDate } from "@/lib/general/formatters";
import { queryKeys } from "@/lib/query/keys";
import { useDialogStore } from "@/lib/stores/dialog-store";

interface PromoCode {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  maxUses: number | null;
  maxUsesPerUser: number;
  usesCount: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { usages: number };
}

interface PromoCodeFormData {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: string;
  minOrder: string;
  maxDiscount: string;
  maxUses: string;
  maxUsesPerUser: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FORM: PromoCodeFormData = {
  code: "",
  type: "FIXED",
  value: "",
  minOrder: "",
  maxDiscount: "",
  maxUses: "",
  maxUsesPerUser: "1",
  startDate: "",
  endDate: "",
};

function PromoStatusBadge({ promo, isExpired, isMaxedOut }: { promo: PromoCode; isExpired: boolean; isMaxedOut: boolean }) {
  if (isExpired) return <Badge variant="secondary">Expired</Badge>;
  if (isMaxedOut) return <Badge variant="secondary">Maxed</Badge>;
  if (promo.isActive) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        Active
      </Badge>
    );
  }
  return <Badge variant="outline">Inactive</Badge>;
}

export function PromoCodeManagement({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const openDialog = useDialogStore((s) => s.openDialog);
  const formatPrice = useFormatPrice();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromoCodeFormData>(EMPTY_FORM);

  const { data: promoCodes = [], isLoading } = useQuery<PromoCode[]>({
    queryKey: queryKeys.promoCodes.all(tenantId),
    queryFn: () =>
      fetch(`/api/admin/${tenantId}/promo-codes`).then((r) => r.json()),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PromoCodeFormData) => {
      const payload = {
        code: data.code,
        type: data.type,
        value:
          data.type === "FIXED"
            ? decimalToCents(data.value || "0")
            : parseInt(data.value || "0"),
        minOrder: decimalToCents(data.minOrder || "0"),
        maxDiscount: data.maxDiscount
          ? decimalToCents(data.maxDiscount)
          : null,
        maxUses: data.maxUses ? parseInt(data.maxUses) : null,
        maxUsesPerUser: parseInt(data.maxUsesPerUser || "1"),
        startDate: data.startDate || null,
        endDate: data.endDate || null,
      };

      const url = editingId
        ? `/api/admin/${tenantId}/promo-codes/${editingId}`
        : `/api/admin/${tenantId}/promo-codes`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.promoCodes.all(tenantId) });
      setSheetOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      toast.success(editingId ? "Promo code updated" : "Promo code created");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }) => {
      const res = await fetch(`/api/admin/${tenantId}/promo-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.promoCodes.all(tenantId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/${tenantId}/promo-codes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.promoCodes.all(tenantId) });
      toast.success("Promo code deleted");
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  };

  const openEdit = (promo: PromoCode) => {
    setEditingId(promo.id);
    setForm({
      code: promo.code,
      type: promo.type,
      value:
        promo.type === "FIXED"
          ? (promo.value / 100).toFixed(2)
          : String(promo.value),
      minOrder: promo.minOrder ? (promo.minOrder / 100).toFixed(2) : "",
      maxDiscount: promo.maxDiscount
        ? (promo.maxDiscount / 100).toFixed(2)
        : "",
      maxUses: promo.maxUses ? String(promo.maxUses) : "",
      maxUsesPerUser: String(promo.maxUsesPerUser),
      startDate: promo.startDate
        ? new Date(promo.startDate).toISOString().slice(0, 10)
        : "",
      endDate: promo.endDate
        ? new Date(promo.endDate).toISOString().slice(0, 10)
        : "",
    });
    setSheetOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.value) {
      toast.error("Code and value are required");
      return;
    }
    saveMutation.mutate(form);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied to clipboard");
  };

  const formatValue = (promo: PromoCode) => {
    if (promo.type === "PERCENTAGE") return `${promo.value}%`;
    return formatPrice(promo.value);
  };

  const isExpired = (promo: PromoCode) => {
    if (!promo.endDate) return false;
    return new Date(promo.endDate) < new Date();
  };

  const isMaxedOut = (promo: PromoCode) => {
    if (!promo.maxUses) return false;
    return promo.usesCount >= promo.maxUses;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promo Codes</h1>
          <p className="text-muted-foreground text-sm">
            Create and manage discount codes for your customers.
          </p>
        </div>
        <Button onClick={openCreate} className="cursor-pointer">
          <Plus className="size-4 mr-2" />
          Create Code
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {promoCodes.filter((p) => p.isActive && !isExpired(p)).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Redemptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {promoCodes.reduce((sum, p) => sum + p._count.usages, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{promoCodes.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && promoCodes.length === 0 && (
            <EmptyState
              icon={Tag}
              title="No promo codes yet"
              description="Create your first promo code to get started."
            />
          )}
          {!isLoading && promoCodes.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Min Order
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Uses</TableHead>
                  <TableHead className="hidden md:table-cell">Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((promo) => (
                  <TableRow
                    key={promo.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(promo)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono font-bold">
                          {promo.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyCode(promo.code);
                          }}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {promo.type === "PERCENTAGE" ? (
                          <Percent className="size-3.5 text-muted-foreground" />
                        ) : (
                          <Tag className="size-3.5 text-muted-foreground" />
                        )}
                        {formatValue(promo)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {promo.minOrder > 0
                        ? formatPrice(promo.minOrder)
                        : "-"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <Users className="size-3.5 text-muted-foreground" />
                        {promo._count.usages}
                        {promo.maxUses ? `/${promo.maxUses}` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {promo.startDate || promo.endDate ? (
                        <div className="flex items-center gap-1">
                          <CalendarDays className="size-3.5" />
                          {promo.startDate
                            ? formatDate(promo.startDate)
                            : "..."}
                          {" - "}
                          {promo.endDate ? formatDate(promo.endDate) : "..."}
                        </div>
                      ) : (
                        "No limit"
                      )}
                    </TableCell>
                    <TableCell>
                      <PromoStatusBadge promo={promo} isExpired={isExpired(promo)} isMaxedOut={isMaxedOut(promo)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={promo.isActive}
                          onCheckedChange={(checked) => {
                            toggleMutation.mutate({
                              id: promo.id,
                              isActive: checked,
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDialog(
                              CONFIRM_DIALOG,
                              {
                                title: "Delete promo code?",
                                description: "This will permanently delete this promo code and cannot be undone.",
                                actionLabel: "Delete",
                              },
                              () => deleteMutation.mutate(promo.id)
                            );
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingId ? "Edit Promo Code" : "Create Promo Code"}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="e.g. SUMMER20"
                className="font-mono uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    type: v as "FIXED" | "PERCENTAGE",
                    value: "",
                  }))
                }
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {form.type === "FIXED" ? "Discount Amount (EUR)" : "Percentage"}
              </Label>
              <Input
                type="number"
                step={form.type === "FIXED" ? "0.01" : "1"}
                min="0"
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: e.target.value }))
                }
                placeholder={form.type === "FIXED" ? "e.g. 5.00" : "e.g. 10"}
              />
            </div>

            {form.type === "PERCENTAGE" && (
              <div className="space-y-2">
                <Label>Max Discount (EUR, optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.maxDiscount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxDiscount: e.target.value }))
                  }
                  placeholder="e.g. 10.00"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Min Order Amount (EUR, optional)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.minOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minOrder: e.target.value }))
                }
                placeholder="e.g. 15.00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Total Uses</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.maxUses}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxUses: e.target.value }))
                  }
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label>Per User Limit</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.maxUsesPerUser}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxUsesPerUser: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="size-4 mr-2 animate-spin" />
              )}
              {editingId ? "Update Code" : "Create Code"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
