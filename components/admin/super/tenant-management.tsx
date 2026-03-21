"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  Globe,
  Mail,
  Pause,
  Play,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  Type,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { queryKeys } from "@/lib/query/keys";

// ─── Types ──────────────────────────────────────────────────

interface TenantConfig {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string | null;
  logo: string | null;
}

interface TenantDomain {
  id: string;
  domain: string;
  isPrimary: boolean;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  domains: TenantDomain[];
  isActive: boolean;
  isPaused: boolean;
  currency: string;
  timezone: string;
  prepTimeMinutes: number;
  phone: string | null;
  email: string | null;
  address: string | null;
  ownerEmail: string | null;
  createdAt: string;
  updatedAt: string;
  config: TenantConfig | null;
  _count: {
    orders: number;
  };
}

const GOOGLE_FONTS = [
  "Inter",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Nunito",
  "Raleway",
  "Playfair Display",
  "Merriweather",
  "Source Sans 3",
  "DM Sans",
  "Outfit",
  "Manrope",
  "Space Grotesk",
  "Sora",
  "Plus Jakarta Sans",
  "Cabin",
  "Quicksand",
  "Mulish",
  "Rubik",
];

// ─── API helpers ────────────────────────────────────────────

async function fetchTenants(): Promise<Tenant[]> {
  const res = await fetch("/api/admin/tenants");
  if (!res.ok) throw new Error("Failed to fetch tenants");
  return res.json();
}

async function createTenant(data: {
  name: string;
  slug: string;
  domains: string[];
  ownerEmail?: string;
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
  if (!res.ok) throw new Error("Failed to delete tenant");
}

// ─── Helpers ────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Validates a bare domain: no protocol, no slashes, no port, just host + optional subdomains */
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

function isValidDomain(value: string): boolean {
  return DOMAIN_REGEX.test(value);
}

/** Strips protocol, trailing slashes, paths -- keeps just the hostname */
function cleanDomain(raw: string): string {
  let d = raw.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "");
  d = d.split("/")[0]; // strip path
  d = d.split(":")[0]; // strip port
  return d;
}

function tryAddDomain(
  raw: string,
  currentDomains: string[],
  setDomains: (d: string[]) => void,
  setInput: (v: string) => void,
  setError: (v: string) => void
) {
  const d = cleanDomain(raw);
  if (!d) return;
  if (!isValidDomain(d)) {
    setError("Enter a valid domain (e.g. orders.example.com)");
    return;
  }
  if (currentDomains.includes(d)) {
    setError("Domain already added");
    return;
  }
  setDomains([...currentDomains, d]);
  setInput("");
  setError("");
}

// ─── Shared UI pieces ────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: typeof Globe; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span>{title}</span>
    </div>
  );
}

function DomainField({
  domains,
  setDomains,
  inputValue,
  setInputValue,
  domainError,
  setDomainError,
  onAdd,
}: {
  domains: string[];
  setDomains: (d: string[]) => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  domainError: string;
  setDomainError: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-3">
      <SectionHeader icon={Globe} title="Custom Domains" />
      <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-3">
        {domains.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {domains.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-mono transition-colors duration-300"
              >
                {d}
                <button
                  type="button"
                  onClick={() => setDomains(domains.filter((x) => x !== d))}
                  className="rounded-sm p-0.5 hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors duration-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (domainError) setDomainError("");
              }}
              placeholder="orders.example.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAdd();
                }
              }}
              className={domainError ? "border-destructive" : ""}
            />
            {domainError && (
              <p className="mt-1 text-xs text-destructive">{domainError}</p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 h-9"
            onClick={onAdd}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Bare domains only — no http:// or paths.
        </p>
      </div>
    </div>
  );
}

// ─── Form state ─────────────────────────────────────────────

interface TenantFormState {
  name: string;
  slug: string;
  ownerEmail: string;
  fontFamily: string;
  domains: string[];
  domainInput: string;
  domainError: string;
}

const EMPTY_FORM: TenantFormState = {
  name: "",
  slug: "",
  ownerEmail: "",
  fontFamily: "",
  domains: [],
  domainInput: "",
  domainError: "",
};

function useTenantForm(initial: TenantFormState = EMPTY_FORM) {
  const [form, setForm] = useState(initial);

  const updateField = useCallback(
    <K extends keyof TenantFormState>(key: K, value: TenantFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const reset = useCallback((values: TenantFormState = EMPTY_FORM) => {
    setForm(values);
  }, []);

  return { form, updateField, reset, setForm } as const;
}

// ─── Component ──────────────────────────────────────────────

export function TenantManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const cf = useTenantForm();
  const ef = useTenantForm();

  useEffect(() => {
    if (!slugTouched) {
      cf.updateField("slug", slugify(cf.form.name));
    }
  }, [cf.form.name, slugTouched, cf.updateField]);

  const populateEditForm = useCallback((tenant: Tenant) => {
    ef.reset({
      name: tenant.name,
      slug: tenant.slug,
      ownerEmail: tenant.ownerEmail || "",
      fontFamily: tenant.config?.fontFamily || "",
      domains: tenant.domains?.map((d) => d.domain) || [],
      domainInput: "",
      domainError: "",
    });
  }, [ef.reset]);

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
      cf.reset();
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
      toast.success("Tenant deleted permanently");
      setDeleteConfirm(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Filtered tenants
  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      t.domains?.some((d) => d.domain.toLowerCase().includes(q))
    );
  });

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

  const handleAddNewDomain = useCallback(() => {
    tryAddDomain(
      cf.form.domainInput, cf.form.domains,
      (d) => cf.updateField("domains", d),
      (v) => cf.updateField("domainInput", v),
      (e) => cf.updateField("domainError", e),
    );
  }, [cf.form.domainInput, cf.form.domains, cf.updateField]);

  const handleAddEditDomain = useCallback(() => {
    tryAddDomain(
      ef.form.domainInput, ef.form.domains,
      (d) => ef.updateField("domains", d),
      (v) => ef.updateField("domainInput", v),
      (e) => ef.updateField("domainError", e),
    );
  }, [ef.form.domainInput, ef.form.domains, ef.updateField]);

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { name, slug, domains, ownerEmail } = cf.form;
    if (!name.trim() || !slug.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      slug: slug.trim(),
      domains,
      ...(ownerEmail.trim() && { ownerEmail: ownerEmail.trim() }),
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { name, slug, domains, ownerEmail, fontFamily } = ef.form;
    if (!editTenant || !name.trim() || !slug.trim()) return;
    updateMutation.mutate({
      id: editTenant.id,
      name: name.trim(),
      slug: slug.trim(),
      domains,
      ownerEmail: ownerEmail.trim(),
      fontFamily: fontFamily.trim() || null,
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
          <DialogContent className="max-w-lg gap-0 p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle className="text-lg">Create New Tenant</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Set up a new store with its owner and custom domains.
              </p>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit}>
              <div className="max-h-[60vh] overflow-y-auto px-6 space-y-6">
                {/* Identity */}
                <div className="space-y-3">
                  <SectionHeader icon={Store} title="Identity" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="create-name" className="text-xs">Name</Label>
                      <Input
                        id="create-name"
                        value={cf.form.name}
                        onChange={(e) => cf.updateField("name", e.target.value)}
                        placeholder="My Restaurant"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="create-slug" className="text-xs">Slug</Label>
                      <Input
                        id="create-slug"
                        value={cf.form.slug}
                        onChange={(e) => {
                          cf.updateField("slug", e.target.value);
                          setSlugTouched(true);
                        }}
                        placeholder="my-restaurant"
                        className="font-mono text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Owner */}
                <div className="space-y-3">
                  <SectionHeader icon={User} title="Store Owner" />
                  <div className="space-y-1.5">
                    <Label htmlFor="create-owner" className="text-xs">Email Address</Label>
                    <Input
                      id="create-owner"
                      type="email"
                      value={cf.form.ownerEmail}
                      onChange={(e) => cf.updateField("ownerEmail", e.target.value)}
                      placeholder="owner@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be an existing account. They&apos;ll get the OWNER role.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Domains */}
                <DomainField
                  domains={cf.form.domains}
                  setDomains={(d) => cf.updateField("domains", d)}
                  inputValue={cf.form.domainInput}
                  setInputValue={(v) => cf.updateField("domainInput", v)}
                  domainError={cf.form.domainError}
                  setDomainError={(e) => cf.updateField("domainError", e)}
                  onAdd={handleAddNewDomain}
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t px-6 py-4 mt-6">
                <Button
                  type="button"
                  variant="ghost"
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
                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      <span className="font-mono">/{tenant.slug}</span>
                      {tenant.domains?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {tenant.domains.length === 1
                            ? tenant.domains[0].domain
                            : `${tenant.domains.length} domains`}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        {tenant._count.orders} orders
                      </span>
                      <span>{tenant.currency}</span>
                      {tenant.ownerEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {tenant.ownerEmail}
                        </span>
                      )}
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
        <DialogContent className="max-w-lg gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg">Edit Tenant</DialogTitle>
            {editTenant && (
              <p className="text-sm text-muted-foreground">
                Manage settings for <span className="font-medium text-foreground">{editTenant.name}</span>
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="max-h-[60vh] overflow-y-auto px-6 space-y-6">
              {/* Identity */}
              <div className="space-y-3">
                <SectionHeader icon={Store} title="Identity" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-name" className="text-xs">Name</Label>
                    <Input
                      id="edit-name"
                      value={ef.form.name}
                      onChange={(e) => ef.updateField("name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-slug" className="text-xs">Slug</Label>
                    <Input
                      id="edit-slug"
                      value={ef.form.slug}
                      onChange={(e) => ef.updateField("slug", e.target.value)}
                      className="font-mono text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Owner */}
              <div className="space-y-3">
                <SectionHeader icon={User} title="Store Owner" />
                <div className="space-y-1.5">
                  <Label htmlFor="edit-owner" className="text-xs">Email Address</Label>
                  <Input
                    id="edit-owner"
                    type="email"
                    value={ef.form.ownerEmail}
                    onChange={(e) => ef.updateField("ownerEmail", e.target.value)}
                    placeholder="owner@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be an existing account. They&apos;ll get the OWNER role.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Domains */}
              <DomainField
                domains={ef.form.domains}
                setDomains={(d) => ef.updateField("domains", d)}
                inputValue={ef.form.domainInput}
                setInputValue={(v) => ef.updateField("domainInput", v)}
                domainError={ef.form.domainError}
                setDomainError={(e) => ef.updateField("domainError", e)}
                onAdd={handleAddEditDomain}
              />

              {/* Font */}
              <Separator />
              <div className="space-y-3">
                <SectionHeader icon={Type} title="Custom Font" />
                <div className="space-y-1.5">
                  <Label htmlFor="edit-font" className="text-xs">Google Font Family</Label>
                  <Select
                    value={ef.form.fontFamily || "__default__"}
                    onValueChange={(v) => ef.updateField("fontFamily", v === "__default__" ? "" : v)}
                  >
                    <SelectTrigger id="edit-font">
                      <SelectValue placeholder="Default (Roboto)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Default (Roboto)</SelectItem>
                      {GOOGLE_FONTS.map((font) => (
                        <SelectItem key={font} value={font}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose a Google Font for the store&apos;s customer-facing pages.
                  </p>
                </div>
              </div>

              {/* Active toggle */}
              {editTenant && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
                    <div>
                      <p className="text-sm font-medium">Active</p>
                      <p className="text-xs text-muted-foreground">
                        Inactive tenants cannot accept orders
                      </p>
                    </div>
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
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t px-6 py-4 mt-6">
              <Button
                type="button"
                variant="ghost"
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
            <DialogTitle>Delete Tenant Permanently</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete this tenant? This will
            remove all orders, products, categories, customers, and settings.
            This action cannot be undone.
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
              {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
