"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Gift, Languages, Leaf, ListChecks, Loader2, Tag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { centsToDecimal, decimalToCents } from "@/lib/general/formatters";
import { OFFER_TYPE_BOGO } from "@/lib/orders/offers";
import type { ModifierGroupRef } from "@/types/admin-menu";

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
  modifierGroups?: { modifierGroup: ModifierGroupRef; freeCount?: number }[];
  hasPreset?: boolean;
  presetOptionIds?: string[];
  presetName?: string | null;
  presetNameEl?: string | null;
  offerType?: string | null;
  offerPrice?: number | null;
  offerStart?: string | null;
  offerEnd?: string | null;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  tenantId: string;
  categoryId: string;
  categories: Category[];
  modifierGroups?: ModifierGroupRef[];
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
  modifierGroups = [],
}: ProductFormDialogProps) => {
  const queryClient = useQueryClient();
  const isEditing = !!product;
  const sessionUploadedUrl = useRef<string | null>(null);

  const [name, setName] = useState("");
  const [nameEl, setNameEl] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionEl, setDescriptionEl] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId);
  const [dietary, setDietary] = useState<Record<string, boolean>>({});
  const [allergens, setAllergens] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [hasPreset, setHasPreset] = useState(false);
  const [presetOptionIds, setPresetOptionIds] = useState<string[]>([]);
  const [presetName, setPresetName] = useState("");
  const [presetNameEl, setPresetNameEl] = useState("");
  const [freeCountByGroup, setFreeCountByGroup] = useState<Record<string, number>>({});
  const [offerEnabled, setOfferEnabled] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerStart, setOfferStart] = useState("");
  const [offerEnd, setOfferEnd] = useState("");

  useEffect(() => {
    if (!open && sessionUploadedUrl.current) {
      const urlToDelete = sessionUploadedUrl.current;
      sessionUploadedUrl.current = null;
      fetch(`/api/admin/${tenantId}/upload`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToDelete }),
      }).catch(() => {});
    }

    if (product) {
      setName(product.name);
      setNameEl(product.nameEl || "");
      setDescription(product.description || "");
      setPrice(centsToDecimal(product.price));
      setImageUrl(product.image || null);
      setSelectedCategoryId(product.categoryId);
      setDietary({
        isVegan: product.isVegan,
        isVegetarian: product.isVegetarian,
        isGlutenFree: product.isGlutenFree,
      });
      setSelectedGroupIds(
        product.modifierGroups?.map((mg) => mg.modifierGroup.id) ?? []
      );
      setHasPreset(product.hasPreset ?? false);
      setPresetOptionIds(product.presetOptionIds ?? []);
      setPresetName(product.presetName || "");
      setPresetNameEl(product.presetNameEl || "");
      const fcMap: Record<string, number> = {};
      product.modifierGroups?.forEach((mg) => {
        if (mg.freeCount && mg.freeCount > 0) {
          fcMap[mg.modifierGroup.id] = mg.freeCount;
        }
      });
      setFreeCountByGroup(fcMap);
      setOfferEnabled(product.offerType === OFFER_TYPE_BOGO);
      setOfferPrice(product.offerPrice ? centsToDecimal(product.offerPrice) : "");
      setOfferStart(product.offerStart ? product.offerStart.slice(0, 16) : "");
      setOfferEnd(product.offerEnd ? product.offerEnd.slice(0, 16) : "");
    } else {
      setName("");
      setNameEl("");
      setDescription("");
      setDescriptionEl("");
      setPrice("");
      setImageUrl(null);
      setSelectedCategoryId(categoryId);
      setDietary({});
      setAllergens("");
      setSelectedGroupIds([]);
      setHasPreset(false);
      setPresetOptionIds([]);
      setPresetName("");
      setPresetNameEl("");
      setFreeCountByGroup({});
      setOfferEnabled(false);
      setOfferPrice("");
      setOfferStart("");
      setOfferEnd("");
    }
  }, [product, categoryId, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const priceInCents = decimalToCents(price);

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
          image: imageUrl,
          categoryId: selectedCategoryId,
          allergens: allergens || null,
          modifierGroupIds: selectedGroupIds,
          freeCountByGroup,
          hasPreset,
          presetOptionIds: hasPreset ? presetOptionIds : [],
          presetName: hasPreset && presetName ? presetName : null,
          presetNameEl: hasPreset && presetNameEl ? presetNameEl : null,
          offerType: offerEnabled ? OFFER_TYPE_BOGO : null,
          offerPrice: offerEnabled && offerPrice ? decimalToCents(offerPrice) : null,
          offerStart: offerEnabled && offerStart ? new Date(offerStart).toISOString() : null,
          offerEnd: offerEnabled && offerEnd ? new Date(offerEnd).toISOString() : null,
          ...dietary,
        }),
      });

      if (!res.ok) throw new Error("Failed to save product");
      return res.json();
    },
    onSuccess: () => {
      sessionUploadedUrl.current = null;
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
      <DialogContent className="sm:max-w-lg min-h-0 p-0">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Product" : "New Product"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-hidden" viewportClassName="!overflow-y-scroll">
          <form onSubmit={handleSubmit} className="space-y-4 px-6 pt-4 pb-6">
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

            {/* Image */}
            <div className="space-y-2">
              <Label>Product Image</Label>
              <ImageUpload
                value={imageUrl}
                onChange={(url) => {
                  if (url) sessionUploadedUrl.current = url;
                  setImageUrl(url || null);
                }}
                onRemove={() => { sessionUploadedUrl.current = null; }}
                uploadUrl={`/api/admin/${tenantId}/upload`}
                imageType="product"
                aspectRatio={1}
              />
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
                step="0.05"
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

            {/* 1+1 Offer */}
            <div className="space-y-3">
              <Label>
                <Gift className="inline size-3.5" /> 1+1 Offer
              </Label>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Enable 1+1 (Buy One Get One)</span>
                <Switch
                  checked={offerEnabled}
                  onCheckedChange={setOfferEnabled}
                />
              </div>
              {offerEnabled && (
                <div className="space-y-3 pl-1">
                  <div className="space-y-2">
                    <Label htmlFor="offer-price">Pair Price (EUR)</Label>
                    <Input
                      id="offer-price"
                      type="number"
                      step="0.05"
                      min="0"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      placeholder="e.g. 3.50 for 2 items"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="offer-start">Start (optional)</Label>
                      <Input
                        id="offer-start"
                        type="datetime-local"
                        value={offerStart}
                        onChange={(e) => setOfferStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="offer-end">End (optional)</Label>
                      <Input
                        id="offer-end"
                        type="datetime-local"
                        value={offerEnd}
                        onChange={(e) => setOfferEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modifier Groups */}
            {modifierGroups.length > 0 && (
              <div className="space-y-2">
                <Label>Modifier groups</Label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-md p-2">
                  {modifierGroups.map((group) => (
                    <div key={group.id} className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          className="rounded shrink-0"
                          checked={selectedGroupIds.includes(group.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroupIds([...selectedGroupIds, group.id]);
                            } else {
                              setSelectedGroupIds(selectedGroupIds.filter((id) => id !== group.id));
                              setFreeCountByGroup((prev) => {
                                const next = { ...prev };
                                delete next[group.id];
                                return next;
                              });
                            }
                          }}
                        />
                        <span className="text-sm truncate">{group.name}</span>
                      </label>
                      {selectedGroupIds.includes(group.id) &&
                        group.options.some((o) => o.priceAdjustment > 0) && (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-muted-foreground">Free:</span>
                          <Input
                            type="number"
                            min="0"
                            className="w-14 h-7 text-xs px-1.5"
                            value={freeCountByGroup[group.id] ?? 0}
                            onChange={(e) =>
                              setFreeCountByGroup((prev) => ({
                                ...prev,
                                [group.id]: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preset Mode */}
            {selectedGroupIds.length > 0 && (
              <div className="space-y-3">
                <Label>
                  <ListChecks className="inline size-3.5" /> Preset Mode
                </Label>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <span className="text-sm">Enable preset option</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Customers can choose &quot;With everything&quot; or customize ingredients
                    </p>
                  </div>
                  <Switch
                    checked={hasPreset}
                    onCheckedChange={(checked) => {
                      setHasPreset(checked);
                      if (!checked) setPresetOptionIds([]);
                    }}
                  />
                </div>

                {/* Per-product preset name and option picker */}
                {hasPreset && (
                  <div className="space-y-3 pl-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="preset-name" className="text-xs">Preset Label (EN)</Label>
                        <Input
                          id="preset-name"
                          value={presetName}
                          onChange={(e) => setPresetName(e.target.value)}
                          placeholder="With everything"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="preset-name-el" className="text-xs">Preset Label (EL)</Label>
                        <Input
                          id="preset-name-el"
                          value={presetNameEl}
                          onChange={(e) => setPresetNameEl(e.target.value)}
                          placeholder="Απ' όλα"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use defaults. Select which options are included for this product:
                    </p>
                    {modifierGroups
                      .filter((g) => selectedGroupIds.includes(g.id))
                      .map((group) => (
                        <div key={group.id}>
                          <p className="text-sm font-medium text-foreground mb-1.5">
                            {group.name}
                          </p>
                          <div className="space-y-1 border rounded-md p-2">
                            {group.options.map((opt) => (
                              <label
                                key={opt.id}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  className="rounded"
                                  checked={presetOptionIds.includes(opt.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setPresetOptionIds([...presetOptionIds, opt.id]);
                                    } else {
                                      setPresetOptionIds(presetOptionIds.filter((id) => id !== opt.id));
                                    }
                                  }}
                                />
                                <span className="text-sm">{opt.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

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
