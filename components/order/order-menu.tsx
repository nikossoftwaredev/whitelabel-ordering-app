"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useCartStore } from "@/lib/stores/cart-store";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  ShoppingBag,
  Leaf,
  WheatOff,
  Store,
} from "lucide-react";
import { ProductDetailSheet } from "./product-detail-sheet";
import { CartSheet } from "./cart-sheet";

interface ModifierOption {
  id: string;
  name: string;
  nameEl: string | null;
  priceAdjustment: number;
  isDefault: boolean;
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

interface Product {
  id: string;
  name: string;
  nameEl: string | null;
  description: string | null;
  image: string | null;
  price: number;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  containsNuts: boolean;
  isSpicy: boolean;
  allergens: string | null;
  modifierGroups: ModifierGroup[];
}

interface Category {
  id: string;
  name: string;
  nameEl: string | null;
  products: Product[];
}

interface MenuData {
  tenant: {
    name: string;
    isPaused: boolean;
    currency: string;
    logo: string | null;
    description: string | null;
  };
  categories: Category[];
}

interface OrderMenuProps {
  tenantSlug: string;
  tenantName: string;
  logo: string | null;
}

const dietaryFilters = [
  { key: "isVegan", label: "Vegan", icon: Leaf },
  { key: "isVegetarian", label: "Vegetarian", icon: Leaf },
  { key: "isGlutenFree", label: "Gluten Free", icon: WheatOff },
] as const;

export const OrderMenu = ({ tenantSlug }: OrderMenuProps) => {
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const cart = useCartStore();
  const itemCount = cart.itemCount();
  const subtotal = cart.subtotal();

  useEffect(() => {
    cart.setTenantSlug(tenantSlug);
  }, [tenantSlug]);

  const { data, isLoading } = useQuery<MenuData>({
    queryKey: queryKeys.menu.all(tenantSlug),
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantSlug}/menu`);
      if (!res.ok) throw new Error("Failed to fetch menu");
      return res.json();
    },
  });

  // Filter products
  const filteredCategories = useMemo(() => {
    if (!data?.categories) return [];

    return data.categories
      .map((cat) => ({
        ...cat,
        products: cat.products.filter((p) => {
          // Search filter
          if (search) {
            const q = search.toLowerCase();
            if (
              !p.name.toLowerCase().includes(q) &&
              !(p.nameEl?.toLowerCase().includes(q)) &&
              !(p.description?.toLowerCase().includes(q))
            )
              return false;
          }
          // Dietary filters
          for (const filter of activeFilters) {
            if (!(p as unknown as Record<string, unknown>)[filter]) return false;
          }
          return true;
        }),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [data?.categories, search, activeFilters]);

  // Auto-select first category
  useEffect(() => {
    if (filteredCategories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(filteredCategories[0].id);
    }
  }, [filteredCategories, activeCategoryId]);

  const toggleFilter = (key: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  if (data?.tenant?.isPaused) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <Store className="size-16 text-muted-foreground/30" />
        <h1 className="text-2xl font-bold">Temporarily Closed</h1>
        <p className="text-muted-foreground">
          We&apos;re not accepting orders right now. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold truncate">
              {data?.tenant?.name || "Menu"}
            </h1>
          </div>
          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Dietary filters */}
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
            {dietaryFilters.map((f) => (
              <Badge
                key={f.key}
                variant={activeFilters.has(f.key) ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap shrink-0"
                onClick={() => toggleFilter(f.key)}
              >
                <f.icon className="size-3 mr-1" />
                {f.label}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      {/* Category tabs */}
      {filteredCategories.length > 0 && (
        <nav className="sticky top-[132px] z-30 bg-background border-b border-border">
          <div className="mx-auto max-w-2xl overflow-x-auto">
            <div className="flex px-4 gap-1 py-2">
              {filteredCategories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={activeCategoryId === cat.id ? "default" : "ghost"}
                  size="sm"
                  className="shrink-0 cursor-pointer"
                  onClick={() => {
                    setActiveCategoryId(cat.id);
                    document
                      .getElementById(`cat-${cat.id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Products */}
      <main className="mx-auto max-w-2xl px-4 pt-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <section key={cat.id} id={`cat-${cat.id}`} className="mb-8">
              <h2 className="text-lg font-semibold mb-3 sticky top-[180px] z-20 bg-background py-1">
                {cat.name}
              </h2>
              <div className="space-y-2">
                {cat.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted/50 transition-colors duration-300"
                    onClick={() => setSelectedProduct(product)}
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="size-20 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Store className="size-6 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-sm">{product.name}</h3>
                          {product.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {product.description}
                            </p>
                          )}
                          <div className="flex gap-1 mt-1">
                            {product.isVegan && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-600 border-green-300">
                                V
                              </Badge>
                            )}
                            {product.isVegetarian && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-600 border-green-300">
                                VG
                              </Badge>
                            )}
                            {product.isGlutenFree && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">
                                GF
                              </Badge>
                            )}
                          </div>
                        </div>
                        <span className="font-semibold text-sm shrink-0">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <Button
            className="w-full h-14 text-base cursor-pointer shadow-lg"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="size-5" />
            <span className="flex-1">View Cart ({itemCount})</span>
            <span className="font-semibold">{formatPrice(subtotal)}</span>
          </Button>
        </div>
      )}

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Cart Sheet */}
      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        tenantSlug={tenantSlug}
      />
    </div>
  );
};
