"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight,Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { CONFIRM_DIALOG } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useDialogStore } from "@/lib/stores/dialog-store";

import { ModifierGroupFormDialog } from "./modifier-group-form-dialog";

interface ModifierOption {
  id: string;
  name: string;
  nameEl: string | null;
  priceAdjustment: number;
  isDefault: boolean;
  isActive: boolean;
}

interface ModifierGroup {
  id: string;
  name: string;
  nameEl: string | null;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

interface Props {
  tenantId: string;
}

export function ModifierGroupPanel({ tenantId }: Props) {
  const queryClient = useQueryClient();
  const openDialog = useDialogStore((s) => s.openDialog);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);

  // The GET API returns a plain array
  const { data: groups = [], isLoading } = useQuery<ModifierGroup[]>({
    queryKey: ["modifier-groups", tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/${tenantId}/modifier-groups`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await fetch(`/api/admin/${tenantId}/modifier-groups/${groupId}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["modifier-groups", tenantId] }),
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["modifier-groups", tenantId] });
  };

  const formatPrice = (cents: number) =>
    cents === 0 ? "" : `+€${(cents / 100).toFixed(2)}`;

  return (
    <>
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Modifier Groups</CardTitle>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setEditingGroup(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-3.5" />
              Add group
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          {isLoading && (
            <p className="text-sm text-muted-foreground px-4 py-8 text-center">Loading...</p>
          )}
          {!isLoading && groups.length === 0 && (
            <p className="text-sm text-muted-foreground px-4 py-8 text-center">
              No modifier groups yet.
              <br />
              Create one to add extras like milk type or size.
            </p>
          )}
          <div className="divide-y divide-border">
            {groups.map((group) => (
              <div key={group.id}>
                {/* Group row */}
                <div
                  className="flex items-center gap-2 px-4 py-3 hover:bg-muted/40 cursor-pointer"
                  onClick={() => setExpanded(expanded === group.id ? null : group.id)}
                >
                  {expanded === group.id ? (
                    <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.options.length} option{group.options.length !== 1 ? "s" : ""}
                      {group.required && " · Required"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingGroup(group);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDialog(
                          CONFIRM_DIALOG,
                          {
                            title: `Delete "${group.name}"?`,
                            description: "This will permanently delete this modifier group and cannot be undone.",
                            actionLabel: "Delete",
                          },
                          () => deleteMutation.mutate(group.id)
                        );
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Options (expanded) */}
                {expanded === group.id && (
                  <div className="bg-muted/20 px-4 pb-3 pt-1 space-y-1">
                    {group.options.length === 0 && (
                      <p className="text-xs text-muted-foreground py-1">No options</p>
                    )}
                    {group.options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2 py-0.5">
                        <span className="text-xs flex-1">{opt.name}</span>
                        {opt.priceAdjustment !== 0 && (
                          <Badge variant="outline" className="text-xs h-5">
                            {formatPrice(opt.priceAdjustment)}
                          </Badge>
                        )}
                        {opt.isDefault && (
                          <Badge variant="secondary" className="text-xs h-5">Default</Badge>
                        )}
                        {!opt.isActive && (
                          <Badge variant="outline" className="text-xs h-5 text-muted-foreground">Off</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ModifierGroupFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenantId={tenantId}
        group={editingGroup}
        onSuccess={handleSuccess}
      />
    </>
  );
}
