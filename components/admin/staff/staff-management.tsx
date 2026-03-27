"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AddButton } from "@/components/add-button";
import { EmptyState } from "@/components/empty-state";
import { ErrorCard } from "@/components/error-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { UserAvatar } from "@/components/user-avatar";
import { queryKeys } from "@/lib/query/keys";

interface StaffUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  phone: string | null;
}

interface StaffRole {
  id: string;
  tenantId: string;
  userId: string;
  role: "SUPER_ADMIN" | "OWNER" | "ADMIN" | "CASHIER";
  user: StaffUser;
}

const ROLE_BADGE_VARIANTS: Record<
  string,
  { className: string; label: string }
> = {
  SUPER_ADMIN: {
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100",
    label: "Super Admin",
  },
  OWNER: {
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-100",
    label: "Owner",
  },
  ADMIN: {
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100",
    label: "Admin",
  },
  CASHIER: {
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100",
    label: "Cashier",
  },
};

function RoleBadge({ role }: { role: string }) {
  const variant = ROLE_BADGE_VARIANTS[role] || {
    className: "bg-gray-100 text-gray-800",
    label: role,
  };
  return (
    <Badge variant="outline" className={variant.className}>
      {variant.label}
    </Badge>
  );
}

function StaffSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4 py-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function StaffManagement({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"ADMIN" | "CASHIER">("CASHIER");
  const [addError, setAddError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<StaffRole | null>(null);

  // Fetch staff
  const {
    data: staff,
    isLoading,
    error,
  } = useQuery<StaffRole[]>({
    queryKey: queryKeys.staff.all(tenantId),
    queryFn: async () => {
      const res = await fetch(`/api/admin/${tenantId}/staff`);
      if (!res.ok) throw new Error("Failed to load staff");
      return res.json();
    },
    enabled: !!tenantId,
  });

  // Add staff mutation
  const addMutation = useMutation({
    mutationFn: async ({
      email,
      role,
    }: {
      email: string;
      role: string;
    }) => {
      const res = await fetch(`/api/admin/${tenantId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add staff");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.staff.all(tenantId),
      });
      toast.success("Staff member added successfully");
      setAddDialogOpen(false);
      setAddEmail("");
      setAddRole("CASHIER");
      setAddError("");
    },
    onError: (err: Error) => {
      setAddError(err.message);
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({
      roleId,
      role,
    }: {
      roleId: string;
      role: string;
    }) => {
      const res = await fetch(`/api/admin/${tenantId}/staff/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.staff.all(tenantId),
      });
      toast.success("Role updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Delete staff mutation
  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const res = await fetch(`/api/admin/${tenantId}/staff/${roleId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove staff");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.staff.all(tenantId),
      });
      toast.success("Staff member removed");
      setConfirmDelete(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setConfirmDelete(null);
    },
  });

  const isProtectedRole = (role: string) =>
    role === "OWNER" || role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Staff Management">
        <AddButton onClick={() => setAddDialogOpen(true)}>
          Add Staff
        </AddButton>
      </PageHeader>

      <Separator />

      {/* Staff list */}
      {isLoading && <StaffSkeleton />}
      {!isLoading && error && (
        <ErrorCard message="Failed to load staff members. Please try again." />
      )}
      {!isLoading && !error && (!staff || staff.length === 0) ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Users}
              title="No staff members yet"
              description="Add your first staff member to get started."
            />
            <div className="flex justify-center pb-4">
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {staff?.map((member) => (
            <Card key={member.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <UserAvatar src={member.user.image} name={member.user.name} email={member.user.email} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {member.user.name || "Unnamed"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {isProtectedRole(member.role) ? (
                    <RoleBadge role={member.role} />
                  ) : (
                    <>
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          updateRoleMutation.mutate({
                            roleId: member.id,
                            role: value,
                          })
                        }
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-blue-500" />
                              Admin
                            </span>
                          </SelectItem>
                          <SelectItem value="CASHIER">
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-green-500" />
                              Cashier
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setConfirmDelete(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Staff Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="p-0">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAddError("");
              addMutation.mutate({ email: addEmail, role: addRole });
            }}
            className="space-y-4 px-6 pt-4 pb-6"
          >
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                placeholder="user@example.com"
                value={addEmail}
                onChange={(e) => {
                  setAddEmail(e.target.value);
                  setAddError("");
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-role">Role</Label>
              <Select
                value={addRole}
                onValueChange={(v) => setAddRole(v as "ADMIN" | "CASHIER")}
              >
                <SelectTrigger id="staff-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="CASHIER">Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {addError && (
              <p className="text-sm text-destructive">{addError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddDialogOpen(false);
                  setAddError("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent variant="compact" showCloseButton={false}>
          <DialogTitle>Remove Staff Member</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Are you sure you want to remove{" "}
            <span className="font-medium text-foreground">
              {confirmDelete?.user.name || confirmDelete?.user.email}
            </span>{" "}
            from your staff? They will lose access to the admin panel.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirmDelete) {
                  deleteMutation.mutate(confirmDelete.id);
                }
              }}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
