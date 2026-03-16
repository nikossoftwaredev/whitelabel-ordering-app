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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, DollarSign, Languages, Tag, Leaf } from "lucide-react";
import { centsToEuros, eurosToCents } from "@/lib/general/formatters";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Category {
  id: string;
  name: string;
  nameEl: string | null;
}

interface Product {
  id: string;
  name: string;
  nameEl: string | null;
  price: number;
  image: string | null;
  isActive: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  description: string | null;
  categoryId: string;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  tenantId: string;
  categoryId: string;
  categories: Category[];
}

const dietaryFields = [
  { key: "isVegan", label: "Vegan" },
  { key: "isVegetarian", label: "Vegetarian" },
  { key: "isGlutenFree", label: "Gluten Free" },
  { key: "isDairyFree", label: "Dairy Free" },
  { key: "containsNuts", label: "Contains Nuts" },
  { key: "isSpicy", label: "Spicy" },
] as const;

export const ProductFormDialog = ({
  open,
  onOpenChange,
  product,
  tenantId,
  categoryId,
  categories,
}: ProductFormDialogProps) => {
  const queryClient = useQueryClient();
  const isEditing = !!product;

  const [name, setName] = useState("");
  const [nameEl, setNameEl] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionEl, setDescriptionEl] = useState("");
  const [price, setPrice] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId);
  const [dietary, setDietary] = useState<Record<string, boolean>>({});
  const [allergens, setAllergens] = useState("");

  useEffect(() => {
    if (product) {
      setName(product.name);
      setNameEl(product.nameEl || "");
      setDescription(product.description || "");
      setPrice(centsToEuros(product.price));
      setSelectedCategoryId(product.categoryId);
      setDietary({
        isVegan: product.isVegan,
        isVegetarian: product.isVegetarian,
        isGlutenFree: product.isGlutenFree,
      });
    } else {
      setName("");
      setNameEl("");
      setDescription("");
      setDescriptionEl("");
      setPrice("");
      setSelectedCategoryId(categoryId);
      setDietary({});
      setAllergens("");
    }
  }, [product, categoryId, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const priceInCents = eurosToCents(price);

      const url = isEditing
        ? `/api/admin/${tenantId}/products/${product.id}`
        : `/api/admin/${tenantId}/products`;

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          nameEl: nameEl || null,
          description: description || null,
          descriptionEl: descriptionEl || null,
          price: priceInCents,
          categoryId: selectedCategoryId,
          allergens: allergens || null,
          ...dietary,
        }),
      });

      if (!res.ok) throw new Error("Failed to save product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "products", tenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "categories", tenantId],
      });
      onOpenChange(false);
      toast.success(isEditing ? "Product updated" : "Product created");
    },
    onError: () => {
      toast.error("Failed to save product");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Product" : "New Product"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <form onSubmit={handleSubmit} className="space-y-4 pr-4">
            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prod-name">
                  <Tag className="inline size-3.5" /> Name (EN)
                </Label>
                <Input
                  id="prod-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Espresso"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-name-el">
                  <Languages className="inline size-3.5" /> Name (EL)
                </Label>
                <Input
                  id="prod-name-el"
                  value={nameEl}
                  onChange={(e) => setNameEl(e.target.value)}
                  placeholder="Εσπρέσο"
                />
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="prod-price">
                <DollarSign className="inline size-3.5" /> Price (EUR)
              </Label>
              <Input
                id="prod-price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="3.50"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="prod-desc">Description (EN)</Label>
              <Textarea
                id="prod-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-desc-el">Description (EL)</Label>
              <Textarea
                id="prod-desc-el"
                value={descriptionEl}
                onChange={(e) => setDescriptionEl(e.target.value)}
                placeholder="Σύντομη περιγραφή"
                rows={2}
              />
            </div>

            {/* Dietary Tags */}
            <div className="space-y-3">
              <Label>
                <Leaf className="inline size-3.5" /> Dietary Tags
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {dietaryFields.map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="text-sm">{field.label}</span>
                    <Switch
                      checked={dietary[field.key] ?? false}
                      onCheckedChange={(checked) =>
                        setDietary((prev) => ({ ...prev, [field.key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Allergens */}
            <div className="space-y-2">
              <Label htmlFor="prod-allergens">Additional Allergens</Label>
              <Input
                id="prod-allergens"
                value={allergens}
                onChange={(e) => setAllergens(e.target.value)}
                placeholder="e.g. sesame, soy"
              />
            </div>

            <DialogFooter className="pt-4">
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
                disabled={mutation.isPending || !name.trim() || !price}
                className="cursor-pointer"
              >
                {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {!mutation.isPending && (isEditing ? "Save" : "Create")}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
