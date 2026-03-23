"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Leaf,
  QrCode,
  Search,
  Store,
  WheatOff,
} from "lucide-react";
import Image from "next/image";
import { useMemo,useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormatPrice } from "@/hooks/use-format-price";
import { queryKeys } from "@/lib/query/keys";

interface ModifierOption {
  id: string;
  name: string;
  priceAdjustment: number;
}

interface ModifierGroup {
  id: string;
  name: string;
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

interface QrMenuProps {
  tenantSlug: string;
}

const dietaryFilters = [
  { key: "isVegan", label: "Vegan", icon: Leaf },
  { key: "isVegetarian", label: "Vegetarian", icon: Leaf },
  { key: "isGlutenFree", label: "Gluten Free", icon: WheatOff },
] as const;

export const QrMenu = ({ tenantSlug }: QrMenuProps) => {
  const formatPrice = useFormatPrice();
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const { data, isLoading } = useQuery<MenuData>({
    queryKey: queryKeys.menu.all(tenantSlug),
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantSlug}/menu`);
      if (!res.ok) throw new Error("Failed to fetch menu");
      return res.json();
    },
  });

  const filteredCategories = useMemo(() => {
    if (!data?.categories) return [];

    return data.categories
      .map((cat) => ({
        ...cat,
        products: cat.products.filter((p) => {
          if (search) {
            const q = search.toLowerCase();
            if (
              !p.name.toLowerCase().includes(q) &&
              !(p.nameEl?.toLowerCase().includes(q)) &&
              !(p.description?.toLowerCase().includes(q))
            )
              return false;
          }
          for (const filter of activeFilters) {
            if (!(p as unknown as Record<string, unknown>)[filter]) return false;
          }
          return true;
        }),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [data?.categories, search, activeFilters]);

  const toggleFilter = (key: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <QrCode className="size-5 text-muted-foreground" />
            <h1 className="text-lg font-bold truncate">
              {data?.tenant?.name || "Menu"}
            </h1>
          </div>
          {data?.tenant?.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {data.tenant.description}
            </p>
          )}
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

      {/* Menu Content */}
      <main className="mx-auto max-w-2xl px-4 pt-4">
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        )}
        {!isLoading && filteredCategories.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-muted-foreground">No products found</p>
          </div>
        )}
        {!isLoading && filteredCategories.length > 0 && (
          filteredCategories.map((cat) => (
            <section key={cat.id} className="mb-6">
              <h2 className="text-lg font-semibold mb-3 sticky top-[140px] z-20 bg-background py-1">
                {cat.name}
                {cat.nameEl && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    {cat.nameEl}
                  </span>
                )}
              </h2>
              <div className="space-y-2">
                {cat.products.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-xl border overflow-hidden transition-colors duration-300"
                  >
                    <div
                      className="flex gap-3 p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        setExpandedProduct(
                          expandedProduct === product.id ? null : product.id
                        )
                      }
                    >
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={64}
                          height={64}
                          className="size-16 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Store className="size-5 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-sm">{product.name}</h3>
                            {product.nameEl && (
                              <p className="text-xs text-muted-foreground">
                                {product.nameEl}
                              </p>
                            )}
                          </div>
                          <span className="font-semibold text-sm shrink-0">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-1">
                          {product.isVegan && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 text-green-600 border-green-300"
                            >
                              V
                            </Badge>
                          )}
                          {product.isVegetarian && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 text-green-600 border-green-300"
                            >
                              VG
                            </Badge>
                          )}
                          {product.isGlutenFree && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 text-amber-600 border-amber-300"
                            >
                              GF
                            </Badge>
                          )}
                          {product.isDairyFree && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 text-blue-600 border-blue-300"
                            >
                              DF
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expandedProduct === product.id && (
                      <div className="px-3 pb-3 space-y-2">
                        <Separator />
                        {product.description && (
                          <p className="text-sm text-muted-foreground">
                            {product.description}
                          </p>
                        )}
                        {product.isSpicy && (
                          <Badge variant="destructive" className="text-xs">
                            Spicy 🌶
                          </Badge>
                        )}
                        {product.containsNuts && (
                          <Badge variant="outline" className="text-xs">
                            Contains Nuts
                          </Badge>
                        )}
                        {product.allergens && (
                          <p className="text-xs text-muted-foreground">
                            Allergens: {product.allergens}
                          </p>
                        )}
                        {product.modifierGroups.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {product.modifierGroups.map((group) => (
                              <div key={group.id}>
                                <p className="text-xs font-semibold">
                                  {group.name}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {group.options.map((opt) => (
                                    <Badge
                                      key={opt.id}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {opt.name}
                                      {opt.priceAdjustment > 0 &&
                                        ` +${formatPrice(opt.priceAdjustment)}`}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))
        )}

        {/* Footer */}
        <div className="text-center py-8 border-t mt-4">
          <p className="text-xs text-muted-foreground">
            Scan the QR code or visit our website to place an order
          </p>
          <Button variant="outline" className="mt-3 cursor-pointer" asChild>
            <a href={`/order`}>Order Online</a>
          </Button>
        </div>
      </main>
    </div>
  );
};
