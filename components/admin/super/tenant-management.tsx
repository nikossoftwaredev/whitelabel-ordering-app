"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Store,
  Trash2,
  Edit,
  ShoppingCart,
  Globe,
  Pause,
  Play,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────

interface TenantConfig {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logo: string | null;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  isActive: boolean;
  isPaused: boolean;
  currency: string;
  timezone: string;
  prepTimeMinutes: number;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  config: TenantConfig | null;
  _count: {
    orders: number;
  };
}

// ─── API helpers ────────────────────────────────────────────

async function fetchTenants(): Promise<Tenant[]> {
  const res = await fetch("/api/admin/tenants");
  if (!res.ok) throw new Error("Failed to fetch tenants");
  return res.json();
}

async function createTenant(data: {
  name: string;
  slug: string;
  domain: string;
}): Promise<Tenant> {
  const res = await fetch("/api/admin/tenants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create tenant");
  }
  return res.json();
}

async function updateTenant({
  id,
  ...data
}: {
  id: string;
  [key: string]: unknown;
}): Promise<Tenant> {
  const res = await fetch(`/api/admin/tenants/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update tenant");
  }
  return res.json();
}

async function deleteTenant(id: string): Promise<void> {
  const res = await fetch(`/api/admin/tenants/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to deactivate tenant");
}

// ─── Slugify helper ─────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Component ──────────────────────────────────────────────

export function TenantManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [editCurrency, setEditCurrency] = useState("");
  const [editTimezone, setEditTimezone] = useState("");
  const [editPrepTime, setEditPrepTime] = useState(15);
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugTouched) {
      setNewSlug(slugify(newName));
    }
  }, [newName, slugTouched]);

  const populateEditForm = useCallback((tenant: Tenant) => {
    setEditName(tenant.name);
    setEditSlug(tenant.slug);
    setEditDomain(tenant.domain || "");
    setEditCurrency(tenant.currency);
    setEditTimezone(tenant.timezone);
    setEditPrepTime(tenant.prepTimeMinutes);
    setEditPhone(tenant.phone || "");
    setEditEmail(tenant.email || "");
    setEditAddress(tenant.address || "");
  }, []);

  // Queries
  const {
    data: tenants = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.tenants.all(),
    queryFn: fetchTenants,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all() });
      toast.success("Tenant created successfully");
      setCreateOpen(false);
      setNewName("");
      setNewSlug("");
      setNewDomain("");
      setSlugTouched(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all() });
      toast.success("Tenant updated successfully");
      setEditTenant(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: updateTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all() });
      toast.success("Tenant status updated");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all() });
      toast.success("Tenant deactivated");
      setDeleteConfirm(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Filtered tenants
  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      (t.domain && t.domain.toLowerCase().includes(search.toLowerCase()))
  );

  function getStatusBadge(tenant: Tenant) {
    if (!tenant.isActive) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    if (tenant.isPaused) {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
          Paused
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        Active
      </Badge>
    );
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      slug: newSlug.trim(),
      domain: newDomain.trim(),
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTenant || !editName.trim() || !editSlug.trim()) return;
    updateMutation.mutate({
      id: editTenant.id,
      name: editName.trim(),
      slug: editSlug.trim(),
      domain: editDomain.trim(),
      currency: editCurrency,
      timezone: editTimezone,
      prepTimeMinutes: editPrepTime,
      phone: editPhone.trim(),
      email: editEmail.trim(),
      address: editAddress.trim(),
    });
  }

  function handleOpenEdit(tenant: Tenant) {
    setEditTenant(tenant);
    populateEditForm(tenant);
  }

  // ─── Loading state ─────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">
          Failed to load tenants. Make sure you have SUPER_ADMIN access.
        </p>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Tenant Management
          </h1>
          <p className="text-muted-foreground">
            Manage all tenants in the platform ({tenants.length} total)
          </p>
        </div>

        {/* Create Tenant Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My Restaurant"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-slug">Slug</Label>
                <Input
                  id="create-slug"
                  value={newSlug}
                  onChange={(e) => {
                    setNewSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  placeholder="my-restaurant"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  URL-friendly identifier. Auto-generated from name.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-domain">
                  Custom Domain (optional)
                </Label>
                <Input
                  id="create-domain"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="orders.myrestaurant.com"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Tenant"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tenants..."
          className="pl-10"
        />
      </div>

      <Separator />

      {/* Tenant List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Store className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No tenants found</p>
          <p className="text-sm text-muted-foreground">
            {search
              ? "Try a different search term"
              : "Create your first tenant to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tenant) => (
            <Card key={tenant.id}>
              <CardContent className="flex items-center justify-between p-4">
                {/* Left: Info */}
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm"
                    style={{
                      backgroundColor:
                        tenant.config?.primaryColor || "#000000",
                    }}
                  >
                    {tenant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{tenant.name}</span>
                      {getStatusBadge(tenant)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="font-mono">/{tenant.slug}</span>
                      {tenant.domain && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {tenant.domain}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        {tenant._count.orders} orders
                      </span>
                      <span>{tenant.currency}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  {/* Pause/Resume toggle */}
                  {tenant.isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title={tenant.isPaused ? "Resume" : "Pause"}
                      onClick={() =>
                        toggleMutation.mutate({
                          id: tenant.id,
                          isPaused: !tenant.isPaused,
                        })
                      }
                    >
                      {tenant.isPaused ? (
                        <Play className="h-4 w-4" />
                      ) : (
                        <Pause className="h-4 w-4" />
                      )}
                    </Button>
                  )}

                  {/* Edit */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(tenant)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  {/* Delete (deactivate) */}
                  {tenant.isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(tenant.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Re-activate */}
                  {!tenant.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleMutation.mutate({
                          id: tenant.id,
                          isActive: true,
                        })
                      }
                    >
                      Re-activate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Tenant Dialog */}
      <Dialog
        open={editTenant !== null}
        onOpenChange={(open) => !open && setEditTenant(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">Slug</Label>
                <Input
                  id="edit-slug"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-domain">Custom Domain</Label>
              <Input
                id="edit-domain"
                value={editDomain}
                onChange={(e) => setEditDomain(e.target.value)}
                placeholder="orders.example.com"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <Input
                  id="edit-currency"
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-timezone">Timezone</Label>
                <Input
                  id="edit-timezone"
                  value={editTimezone}
                  onChange={(e) => setEditTimezone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-prep">Prep Time (minutes)</Label>
              <Input
                id="edit-prep"
                type="number"
                min={1}
                value={editPrepTime}
                onChange={(e) => setEditPrepTime(Number(e.target.value))}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </div>

            {editTenant && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-active">Active</Label>
                  <Switch
                    id="edit-active"
                    checked={editTenant.isActive}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({
                        id: editTenant.id,
                        isActive: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-paused">Paused</Label>
                  <Switch
                    id="edit-paused"
                    checked={editTenant.isPaused}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({
                        id: editTenant.id,
                        isPaused: checked,
                      })
                    }
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTenant(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Tenant</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to deactivate this tenant? The tenant will no
            longer accept new orders. This can be reversed later.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteConfirm) deleteMutation.mutate(deleteConfirm);
              }}
            >
              {deleteMutation.isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
