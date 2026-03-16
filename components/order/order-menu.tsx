"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useCartStore } from "@/lib/stores/cart-store";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Search,
  Leaf,
  WheatOff,
  Store,
  Clock,
  Plus,
  Info,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ProductDetailSheet } from "./product-detail-sheet";
import { CartSheet } from "./cart-sheet";

/* ─────────────── Types ─────────────── */
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
    coverImage: string | null;
    description: string | null;
    prepTimeMinutes: number;
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

const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

/* ─────────────── Popular Carousel Card ─────────────── */
function PopularCard({
  product,
  onClick,
  onQuickAdd,
}: {
  product: Product;
  onClick: () => void;
  onQuickAdd: (e: React.MouseEvent) => void;
}) {
  const hasRequiredModifiers = product.modifierGroups.some((g) => g.required);
  return (
    <div className="cursor-pointer group" onClick={onClick}>
      <div className="relative overflow-hidden rounded-2xl aspect-square bg-muted">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
            <Store className="size-8 text-muted-foreground/30" />
          </div>
        )}
        <Button
          size="icon-sm"
          onClick={hasRequiredModifiers ? (e: React.MouseEvent) => { e.stopPropagation(); onClick(); } : onQuickAdd}
          className="absolute bottom-2 right-2 size-8 rounded-full shadow-lg hover:scale-110 active:scale-95"
          style={{ background: "var(--brand-primary, hsl(var(--primary)))", color: "white" }}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="mt-2 px-0.5">
        <h3 className="text-[13px] font-semibold leading-tight line-clamp-2">{product.name}</h3>
        <p className="text-[13px] text-muted-foreground mt-0.5 font-medium">{formatPrice(product.price)}</p>
      </div>
    </div>
  );
}

/* ─────────────── Wolt-style Horizontal Product Card ─────────────── */
function ProductCard({
  product,
  onClick,
  onQuickAdd,
}: {
  product: Product;
  onClick: () => void;
  onQuickAdd: (e: React.MouseEvent) => void;
}) {
  const hasRequiredModifiers = product.modifierGroups.some((g) => g.required);
  return (
    <div className="flex gap-3 py-3 cursor-pointer group" onClick={onClick}>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className="font-semibold text-[15px] leading-tight line-clamp-2">{product.name}</h3>
        {product.description && (
          <p className="text-[13px] text-muted-foreground line-clamp-2 mt-1 leading-snug">{product.description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          {product.isVegan && <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">Vegan</span>}
          {product.isVegetarian && <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">Vegetarian</span>}
          {product.isGlutenFree && <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">GF</span>}
        </div>
        <p className="text-[14px] font-semibold mt-1.5">{formatPrice(product.price)}</p>
      </div>
      <div className="relative shrink-0 w-[100px] h-[100px] md:w-[130px] md:h-[130px] rounded-xl overflow-hidden bg-muted">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
            <Store className="size-6 text-muted-foreground/20" />
          </div>
        )}
        <Button
          size="icon-xs"
          onClick={hasRequiredModifiers ? (e: React.MouseEvent) => { e.stopPropagation(); onClick(); } : onQuickAdd}
          className="absolute bottom-1.5 right-1.5 size-7 rounded-full shadow-md hover:scale-110 active:scale-95"
          style={{ background: "var(--brand-primary, hsl(var(--primary)))", color: "white" }}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ─────────────── Loading Skeleton ─────────────── */
function MenuSkeleton() {
  return (
    <div>
      <div className="px-4 py-3 flex items-center gap-2">
        <Skeleton className="size-5 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="w-full h-52 rounded-none" />
      <div className="flex flex-col items-center -mt-12 relative z-10 pb-4">
        <Skeleton className="size-24 rounded-2xl border-4 border-background" />
        <Skeleton className="h-7 w-44 mt-3" />
        <Skeleton className="h-4 w-56 mt-2" />
        <Skeleton className="h-4 w-32 mt-2" />
      </div>
      <div className="px-4"><Skeleton className="w-full h-12 rounded-xl" /></div>
      <div className="px-4 mt-5 space-y-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 py-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-4 w-16 mt-1" />
            </div>
            <Skeleton className="shrink-0 w-[100px] h-[100px] rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
export const OrderMenu = ({ tenantSlug, tenantName, logo }: OrderMenuProps) => {
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const cart = useCartStore();
  const itemCount = cart.itemCount();
  const subtotal = cart.subtotal();

  useEffect(() => { cart.setTenantSlug(tenantSlug); }, [tenantSlug]);

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
            if (!p.name.toLowerCase().includes(q) && !p.nameEl?.toLowerCase().includes(q) && !p.description?.toLowerCase().includes(q)) return false;
          }
          for (const filter of activeFilters) {
            if (!(p as unknown as Record<string, unknown>)[filter]) return false;
          }
          return true;
        }),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [data?.categories, search, activeFilters]);

  const popularProducts = useMemo(() => {
    if (!data?.categories) return [];
    return data.categories.flatMap((c) => c.products).slice(0, 8);
  }, [data?.categories]);

  useEffect(() => {
    if (filteredCategories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(filteredCategories[0].id);
    }
  }, [filteredCategories, activeCategoryId]);

  /* Intersection Observer — auto-highlight active tab */
  useEffect(() => {
    const sections = sectionRefs.current;
    if (sections.size === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-category-id");
            if (id) {
              setActiveCategoryId(id);
              document.getElementById(`tab-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            }
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filteredCategories]);

  const toggleFilter = (key: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const scrollToCategory = (categoryId: string) => {
    const el = sectionRefs.current.get(categoryId);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 160;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setActiveCategoryId(categoryId);
  };

  const handleQuickAdd = useCallback(
    (product: Product) => (e: React.MouseEvent) => {
      e.stopPropagation();
      const defaultModifiers = product.modifierGroups.flatMap((group) =>
        group.options.filter((o) => o.isDefault).map((o) => ({ modifierOptionId: o.id, name: o.name, priceAdjustment: o.priceAdjustment }))
      );
      cart.addItem({ productId: product.id, productName: product.name, productImage: product.image, basePrice: product.price, quantity: 1, modifiers: defaultModifiers, notes: "" });
    },
    [cart]
  );

  if (data?.tenant?.isPaused) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <Store className="size-16 text-muted-foreground/30" />
        <h1 className="text-2xl font-bold">Temporarily Closed</h1>
        <p className="text-muted-foreground">We&apos;re not accepting orders right now. Please check back later.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen bg-background pb-24"><MenuSkeleton /></div>;
  }

  const storeName = data?.tenant?.name || tenantName;
  const storeDescription = data?.tenant?.description;
  const coverImage = data?.tenant?.coverImage;
  const storeLogo = data?.tenant?.logo || logo;
  const prepTime = data?.tenant?.prepTimeMinutes;

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* ═══ HERO — Cover image with centered logo ═══ */}
      <div className="relative">
        {/* Cover image — taller on desktop */}
        <div className="h-56 md:h-72 lg:h-80 overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt={storeName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--brand-primary,#6b7280)]/30 via-[var(--brand-primary,#6b7280)]/15 to-muted/20" />
          )}
        </div>

        {/* Centered logo overlapping cover bottom — exactly like Wolt */}
        <div className="flex flex-col items-center -mt-12 relative z-10">
          {storeLogo ? (
            <div className="size-24 rounded-2xl bg-background shadow-xl border-4 border-background overflow-hidden flex items-center justify-center">
              <img src={storeLogo} alt={storeName} className="w-full h-full object-contain p-2" />
            </div>
          ) : (
            <div className="size-24 rounded-2xl shadow-xl border-4 border-background flex items-center justify-center" style={{ backgroundColor: "var(--brand-primary, hsl(var(--primary)))" }}>
              <span className="text-white text-3xl font-bold">{storeName.charAt(0)}</span>
            </div>
          )}

          {/* Store name — large, centered */}
          <h1 className="text-[22px] font-bold mt-3 text-center px-6 leading-tight">
            {storeName}
          </h1>

          {/* Info line — like Wolt: prep time · description */}
          <div className="flex items-center gap-1.5 mt-2 text-[13px] text-muted-foreground flex-wrap justify-center px-6">
            {prepTime && (
              <>
                <Clock className="size-3.5" />
                <span>{prepTime} min</span>
                <span className="mx-0.5">·</span>
              </>
            )}
            {storeDescription && (
              <span className="text-center line-clamp-1">{storeDescription}</span>
            )}
          </div>

          {/* Store details link — cyan/brand color */}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2.5 text-[13px] font-semibold hover:opacity-80 h-auto py-1 px-2"
            style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
          >
            <Info className="size-3.5" />
            Store details
          </Button>
        </div>
      </div>

      {/* ═══ SEARCH BAR ═══ */}
      <div className="px-4 mt-5 mb-2 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search in ${storeName}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-xl bg-muted/50 border border-border/50 text-[15px] focus-visible:ring-1 focus-visible:ring-[var(--brand-primary,hsl(var(--ring)))]"
          />
        </div>
      </div>

      {/* ═══ STICKY — dietary filters + category tabs ═══ */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-md">
        {/* Dietary filter pills */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide max-w-2xl mx-auto">
          {dietaryFilters.map((f) => (
            <Badge
              key={f.key}
              variant={activeFilters.has(f.key) ? "default" : "outline"}
              className={`cursor-pointer whitespace-nowrap shrink-0 rounded-full text-xs py-1.5 px-3 transition-all duration-200 ${
                activeFilters.has(f.key)
                  ? "bg-[var(--brand-primary,hsl(var(--primary)))] text-white border-transparent hover:opacity-90"
                  : "hover:bg-muted"
              }`}
              onClick={() => toggleFilter(f.key)}
            >
              <f.icon className="size-3 mr-1" />
              {f.label}
            </Badge>
          ))}
        </div>

        {/* Category tabs — Wolt uppercase style */}
        {filteredCategories.length > 0 && (
          <div ref={tabsContainerRef} className="flex overflow-x-auto scrollbar-hide border-b border-border max-w-2xl mx-auto">
            {filteredCategories.map((cat) => {
              const isActive = activeCategoryId === cat.id;
              return (
                <Button
                  key={cat.id}
                  id={`tab-${cat.id}`}
                  variant="ghost"
                  className={`shrink-0 px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap uppercase tracking-wide rounded-none h-auto relative ${
                    isActive ? "text-(--brand-primary,hsl(var(--primary)))" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => scrollToCategory(cat.id)}
                >
                  {cat.name}
                  {isActive && <span className="absolute bottom-0 left-2 right-2 h-0.75 rounded-full bg-(--brand-primary,hsl(var(--primary)))" />}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ CONTENT ═══ */}
      <main className="max-w-2xl mx-auto">
        {filteredCategories.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center px-4">
            <Search className="size-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : (
          <>
            {/* Popular carousel */}
            {!search && activeFilters.size === 0 && popularProducts.length > 0 && (
              <section className="pt-5 pb-1 px-4">
                <h2 className="text-[17px] font-bold mb-3">Popular</h2>
                <Carousel opts={{ align: "start", dragFree: true, watchDrag: true }} className="-mx-1.5">
                  <CarouselContent className="-ml-3">
                    {popularProducts.map((product) => (
                      <CarouselItem key={product.id} className="pl-3 basis-37.5 md:basis-45">
                        <PopularCard product={product} onClick={() => setSelectedProduct(product)} onQuickAdd={handleQuickAdd(product)} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden md:flex -left-3 size-8" />
                  <CarouselNext className="hidden md:flex -right-3 size-8" />
                </Carousel>
              </section>
            )}

            {/* Category sections */}
            {filteredCategories.map((cat) => (
              <section
                key={cat.id}
                data-category-id={cat.id}
                ref={(el) => { if (el) sectionRefs.current.set(cat.id, el); else sectionRefs.current.delete(cat.id); }}
                className="px-4 pt-5"
              >
                <h2 className="text-[17px] font-bold mb-1">{cat.name}</h2>
                <div className="divide-y divide-border/50">
                  {cat.products.map((product) => (
                    <ProductCard key={product.id} product={product} onClick={() => setSelectedProduct(product)} onQuickAdd={handleQuickAdd(product)} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </main>

      {/* ═══ FLOATING CART BAR ═══ */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-in slide-in-from-bottom-4 duration-300">
          <Button
            className="w-full flex items-center gap-3 h-14 px-5 rounded-2xl shadow-xl active:scale-[0.98]"
            style={{ background: "var(--brand-primary, hsl(var(--primary)))", color: "white" }}
            onClick={() => setCartOpen(true)}
          >
            <span className="flex items-center justify-center size-7 rounded-lg bg-white/20 text-sm font-bold tabular-nums">{itemCount}</span>
            <span className="flex-1 text-left font-semibold text-[15px]">View Cart</span>
            <span className="font-bold text-[15px] tabular-nums">{formatPrice(subtotal)}</span>
          </Button>
        </div>
      )}

      <ProductDetailSheet product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} tenantSlug={tenantSlug} />
    </div>
  );
};
