"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Tag, Languages } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  nameEl: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: { products: number };
}

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  tenantId: string;
}

export const CategoryFormDialog = ({
  open,
  onOpenChange,
  category,
  tenantId,
}: CategoryFormDialogProps) => {
  const queryClient = useQueryClient();
  const isEditing = !!category;

  const [name, setName] = useState("");
  const [nameEl, setNameEl] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (category) {
      setName(category.name);
      setNameEl(category.nameEl || "");
    } else {
      setName("");
      setNameEl("");
      setDescription("");
    }
  }, [category, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const url = isEditing
        ? `/api/admin/${tenantId}/categories/${category.id}`
        : `/api/admin/${tenantId}/categories`;

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nameEl: nameEl || null, description: description || null }),
      });

      if (!res.ok) throw new Error("Failed to save category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "categories", tenantId],
      });
      onOpenChange(false);
      toast.success(isEditing ? "Category updated" : "Category created");
    },
    onError: () => {
      toast.error("Failed to save category");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Category" : "New Category"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">
              <Tag className="inline size-3.5" /> Name (English)
            </Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hot Drinks"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-name-el">
              <Languages className="inline size-3.5" /> Name (Greek)
            </Label>
            <Input
              id="cat-name-el"
              value={nameEl}
              onChange={(e) => setNameEl(e.target.value)}
              placeholder="e.g. Ζεστά Ροφήματα"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !name.trim()}
              className="cursor-pointer"
            >
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEditing ? (
                "Save"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
