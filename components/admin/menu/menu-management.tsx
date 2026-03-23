"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GripVertical,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { CONFIRM_DIALOG } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/components/tenant-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useFormatPrice } from "@/hooks/use-format-price";
import { queryKeys } from "@/lib/query/keys";
import { useDialogStore } from "@/lib/stores/dialog-store";

import { CategoryFormDialog } from "./category-form-dialog";
import { ModifierGroupPanel } from "./modifier-group-panel";
import { ProductFormDialog } from "./product-form-dialog";

interface Category {
  id: string;
  name: string;
  nameEl: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: { products: number };
}

interface ModifierGroupRef {
  id: string;
  name: string;
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

interface MenuManagementProps {
  tenantId: string;
}

export const MenuManagement = ({ tenantId: propTenantId }: MenuManagementProps) => {
  const tenant = useTenant();
  const tenantId = propTenantId || tenant.id;
  const formatPrice = useFormatPrice();
  const openDialog = useDialogStore((s) => s.openDialog);
  const queryClient = useQueryClient();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Fetch categories
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["admin", "categories", tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/${tenantId}/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
    enabled: !!tenantId,
  });

  // Fetch modifier groups
  const { data: modifierGroups = [] } = useQuery<ModifierGroupRef[]>({
    queryKey: ["modifier-groups", tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/${tenantId}/modifier-groups`);
      if (!res.ok) throw new Error("Failed to fetch modifier groups");
      return res.json();
    },
    enabled: !!tenantId,
  });

  // Fetch products for selected category
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["admin", "products", tenantId, selectedCategoryId],
    queryFn: async () => {
      const url = selectedCategoryId
        ? `/api/admin/${tenantId}/products?categoryId=${selectedCategoryId}`
        : `/api/admin/${tenantId}/products`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    enabled: !!tenantId,
  });

  // Delete category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const res = await fetch(
        `/api/admin/${tenantId}/categories/${categoryId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "categories", tenantId],
      });
      if (selectedCategoryId) setSelectedCategoryId(null);
      toast.success("Category deleted");
    },
  });

  // Delete product
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(
        `/api/admin/${tenantId}/products/${productId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "products", tenantId],
      });
      toast.success("Product deleted");
    },
  });

  // Auto-select first category
  if (categories.length > 0 && !selectedCategoryId) {
    setSelectedCategoryId(categories[0].id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu"
        description="Manage categories, products, and modifiers"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_300px]">
        {/* Categories Panel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">Categories</CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer"
              onClick={() => {
                setEditingCategory(null);
                setCategoryDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingCategories && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingCategories && categories.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No categories yet. Create one to get started.
              </div>
            ) : (
              <div className="divide-y">
                {categories.map((cat: Category) => (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-colors duration-300 ${
                      selectedCategoryId === cat.id
                        ? "bg-accent"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedCategoryId(cat.id)}
                  >
                    <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-sm">
                          {cat.name}
                        </span>
                        {!cat.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Hidden
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {cat._count.products} product{cat._count.products !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategory(cat);
                          setCategoryDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 cursor-pointer text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDialog(
                            CONFIRM_DIALOG,
                            {
                              title: `Delete "${cat.name}"?`,
                              description: "This will permanently delete this category and cannot be undone.",
                              actionLabel: "Delete",
                            },
                            () => deleteCategoryMutation.mutate(cat.id)
                          );
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products Panel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">
              {selectedCategoryId
                ? `Products in "${categories.find((c: Category) => c.id === selectedCategoryId)?.name || ""}"`
                : "All Products"}
            </CardTitle>
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                setEditingProduct(null);
                setProductDialogOpen(true);
              }}
              disabled={!selectedCategoryId && categories.length > 0}
            >
              <Plus className="size-4" />
              Add Product
            </Button>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {loadingProducts && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingProducts && products.length === 0 ? (
              <EmptyState icon={Package} title="No products in this category" />
            ) : (
              <div className="divide-y">
                {products.map((product: Product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors duration-300"
                  >
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={48}
                        height={48}
                        className="size-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Package className="size-5 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {product.name}
                        </span>
                        {!product.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Hidden
                          </Badge>
                        )}
                        {product.isVegan && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                            V
                          </Badge>
                        )}
                        {product.isVegetarian && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                            VG
                          </Badge>
                        )}
                        {product.isGlutenFree && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            GF
                          </Badge>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {product.description}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold text-sm tabular-nums">
                      {formatPrice(product.price)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 cursor-pointer"
                        onClick={() => {
                          setEditingProduct(product);
                          setProductDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 cursor-pointer text-destructive hover:text-destructive"
                        onClick={() =>
                          openDialog(
                            CONFIRM_DIALOG,
                            {
                              title: `Delete "${product.name}"?`,
                              description: "This will permanently delete this product and cannot be undone.",
                              actionLabel: "Delete",
                            },
                            () => deleteProductMutation.mutate(product.id)
                          )
                        }
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modifier Groups Panel */}
        <ModifierGroupPanel tenantId={tenantId} />
      </div>

      {/* Category Dialog */}
      <CategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
        tenantId={tenantId}
      />

      {/* Product Dialog */}
      <ProductFormDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        product={editingProduct}
        tenantId={tenantId}
        categoryId={selectedCategoryId || ""}
        categories={categories}
        modifierGroups={modifierGroups}
      />
    </div>
  );
};
