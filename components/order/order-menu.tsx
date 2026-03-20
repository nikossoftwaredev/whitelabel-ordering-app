"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bike,
  Info,
  Leaf,
  Minus,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Store,
  WheatOff,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback,useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormatPrice } from "@/hooks/use-format-price";
import { queryKeys } from "@/lib/query/keys";
import { useCartStore } from "@/lib/stores/cart-store";

import { CartSheet } from "./cart-sheet";
import { ProductDetailSheet } from "./product-detail-sheet";

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


/* ─────────────── Popular Carousel Card ─────────────── */
function PopularCard({
  product,
  onClick,
  onQuickAdd,
  onQuickRemove,
  onIncrement,
  formatPrice,
  quantity,
}: {
  product: Product;
  onClick: () => void;
  onQuickAdd: (e: React.MouseEvent) => void;
  onQuickRemove: (e: React.MouseEvent) => void;
  onIncrement: (e: React.MouseEvent) => void;
  formatPrice: (cents: number) => string;
  quantity: number;
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
        <div
          className="absolute top-2 right-2 flex items-center rounded-full shadow-lg overflow-hidden bg-black/80 backdrop-blur-sm transition-all duration-300 ease-in-out"
          style={{ width: quantity > 0 ? 96 : 34, height: 34 }}
          onClick={(e) => e.stopPropagation()}
        >
          {quantity > 0 ? (
            <>
              <button className="size-8 flex items-center justify-center text-white hover:bg-white/20 transition-colors duration-200 cursor-pointer shrink-0" onClick={onQuickRemove}>
                <Minus className="size-3.5" />
              </button>
              <span className="text-[13px] font-bold text-white tabular-nums flex-1 text-center">{quantity}</span>
              <button className="size-8 flex items-center justify-center text-white hover:bg-white/20 transition-colors duration-200 cursor-pointer shrink-0" onClick={onIncrement}>
                <Plus className="size-3.5" />
              </button>
            </>
          ) : (
            <button
              className="size-8.5 flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-colors duration-200"
              onClick={hasRequiredModifiers ? () => onClick() : onQuickAdd}
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
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
  onQuickAdd,
  onQuickRemove,
  onIncrement,
  onDetail,
  formatPrice,
  quantity,
  modifierSummary,
}: {
  product: Product;
  onQuickAdd: (e: React.MouseEvent) => void;
  onQuickRemove: (e: React.MouseEvent) => void;
  onIncrement: (e: React.MouseEvent) => void;
  onDetail: () => void;
  formatPrice: (cents: number) => string;
  quantity: number;
  modifierSummary?: string;
}) {
  const hasRequiredModifiers = product.modifierGroups.some((g) => g.required);
  return (
    <div
      className="flex gap-3 py-3 cursor-pointer group active:scale-[0.99] transition-transform duration-150"
      onClick={quantity > 0 || hasRequiredModifiers ? onDetail : (e) => onQuickAdd(e)}
    >
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className="font-semibold text-[15px] leading-tight line-clamp-2">{product.name}</h3>
        {product.description && (
          <p className="text-[13px] text-muted-foreground line-clamp-2 mt-1 leading-snug">{product.description}</p>
        )}
        {modifierSummary && (
          <p className="text-[12px] mt-0.5 line-clamp-1 leading-snug" style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}>{modifierSummary}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          {product.isVegan && <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">Vegan</span>}
          {product.isVegetarian && <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">Vegetarian</span>}
          {product.isGlutenFree && <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">GF</span>}
        </div>
        <p className="text-[14px] font-semibold mt-1.5" style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}>{formatPrice(product.price)}</p>
      </div>
      <div className="relative shrink-0 w-[100px] h-[100px] md:w-[130px] md:h-[130px] rounded-xl overflow-hidden bg-muted">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
            <Store className="size-6 text-muted-foreground/20" />
          </div>
        )}
        <div
          className="absolute top-0 right-0 flex items-center rounded-full shadow-md overflow-hidden bg-black/80 backdrop-blur-sm m-1 transition-all duration-300 ease-in-out"
          style={{ width: quantity > 0 ? 96 : 34, height: 34 }}
          onClick={(e) => e.stopPropagation()}
        >
          {quantity > 0 ? (
            <>
              <button className="size-8 flex items-center justify-center text-white hover:bg-white/20 transition-colors duration-200 cursor-pointer shrink-0" onClick={onQuickRemove}>
                <Minus className="size-3.5" />
              </button>
              <span className="text-[13px] font-bold text-white tabular-nums flex-1 text-center">{quantity}</span>
              <button className="size-8 flex items-center justify-center text-white hover:bg-white/20 transition-colors duration-200 cursor-pointer shrink-0" onClick={onIncrement}>
                <Plus className="size-3.5" />
              </button>
            </>
          ) : (
            <button
              className="size-8.5 flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-colors duration-200"
              onClick={hasRequiredModifiers ? onDetail : onQuickAdd}
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Cart Item Variant Card ─────────────── */
function VariantCard({
  product,
  modifierSummary,
  quantity,
  onEdit,
  onIncrement,
  onDecrement,
  formatPrice,
}: {
  product: Product;
  modifierSummary: string;
  quantity: number;
  onEdit: () => void;
  onIncrement: (e: React.MouseEvent) => void;
  onDecrement: (e: React.MouseEvent) => void;
  formatPrice: (cents: number) => string;
}) {
  return (
    <div
      className="flex gap-3 py-3 cursor-pointer group active:scale-[0.99] animate-in slide-in-from-top-2 fade-in duration-300"
      onClick={onEdit}
    >
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className="font-semibold text-[15px] leading-tight line-clamp-2">{product.name}</h3>
        <p className="text-[13px] text-muted-foreground line-clamp-1 mt-0.5 leading-snug">{modifierSummary}</p>
        <p className="text-[14px] font-semibold mt-1" style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}>{formatPrice(product.price)}</p>
      </div>
      <div className="relative shrink-0 w-[100px] h-[100px] md:w-[130px] md:h-[130px] rounded-xl overflow-hidden bg-muted">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
            <Store className="size-6 text-muted-foreground/20" />
          </div>
        )}
        <div
          className="absolute top-0 right-0 flex items-center rounded-full shadow-md overflow-hidden bg-black/80 backdrop-blur-sm m-1"
          style={{ width: 96, height: 34 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="size-8 flex items-center justify-center text-white hover:bg-white/20 transition-colors duration-200 cursor-pointer shrink-0" onClick={onDecrement}>
            <Minus className="size-3.5" />
          </button>
          <span className="text-[13px] font-bold text-white tabular-nums flex-1 text-center">{quantity}</span>
          <button className="size-8 flex items-center justify-center text-white hover:bg-white/20 transition-colors duration-200 cursor-pointer shrink-0" onClick={onIncrement}>
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Loading Skeleton ─────────────── */
function MenuSkeleton() {
  return (
    <div>
      {/* Cover image skeleton */}
      <Skeleton className="w-full h-56 md:h-72 lg:h-80 rounded-none" />

      {/* Logo + store info */}
      <div className="flex flex-col items-center -mt-12 relative z-10 pb-4">
        <Skeleton className="size-24 rounded-2xl border-4 border-background" />
        <Skeleton className="h-7 w-44 mt-3" />
        <Skeleton className="h-4 w-56 mt-2" />
        <Skeleton className="h-4 w-32 mt-2" />
      </div>

      {/* Search bar */}
      <div className="px-4 max-w-2xl mx-auto">
        <Skeleton className="w-full h-12 rounded-xl" />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 px-4 py-3 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>

      {/* Product list */}
      <div className="px-4 mt-2 max-w-2xl mx-auto space-y-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 py-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-4 w-16 mt-1" />
            </div>
            <Skeleton className="shrink-0 w-25 h-25 md:w-32.5 md:h-32.5 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
export const OrderMenu = ({ tenantSlug, tenantName, logo }: OrderMenuProps) => {
  const formatPrice = useFormatPrice();
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<{ cartItemId: string; quantity: number; modifiers: { modifierOptionId: string; name: string; priceAdjustment: number }[] } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const cart = useCartStore();
  const itemCount = cart.itemCount();
  const subtotal = cart.subtotal();

  // Quantity per productId (summed across all cart items for that product)
  const quantityByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart.items) {
      map[item.productId] = (map[item.productId] || 0) + item.quantity;
    }
    return map;
  }, [cart.items]);

  const handleQuickRemove = useCallback(
    (product: Product) => (e: React.MouseEvent) => {
      e.stopPropagation();
      const cartItems = cart.items.filter((i) => i.productId === product.id);
      if (cartItems.length === 0) return;
      const last = cartItems[cartItems.length - 1];
      cart.updateQuantity(last.cartItemId, last.quantity - 1);
    },
    [cart]
  );

  const handleIncrement = useCallback(
    (product: Product) => (e: React.MouseEvent) => {
      e.stopPropagation();
      const cartItems = cart.items.filter((i) => i.productId === product.id);
      if (cartItems.length === 0) return;
      const last = cartItems[cartItems.length - 1];
      cart.updateQuantity(last.cartItemId, last.quantity + 1);
    },
    [cart]
  );

  const openProduct = useCallback((product: Product) => {
    const cartItems = cart.items.filter((i) => i.productId === product.id);
    if (cartItems.length > 0) {
      const last = cartItems[cartItems.length - 1];
      setEditingCartItem({ cartItemId: last.cartItemId, quantity: last.quantity, modifiers: last.modifiers });
    } else {
      setEditingCartItem(null);
    }
    setSelectedProduct(product);
  }, [cart.items]);

  const openCartItemEdit = useCallback((product: Product, cartItemId: string) => {
    const item = cart.items.find((i) => i.cartItemId === cartItemId);
    if (!item) return;
    setEditingCartItem({ cartItemId: item.cartItemId, quantity: item.quantity, modifiers: item.modifiers });
    setSelectedProduct(product);
  }, [cart.items]);

  // Group cart items by productId for rendering variants
  const cartItemsByProduct = useMemo(() => {
    const map: Record<string, typeof cart.items> = {};
    for (const item of cart.items) {
      if (!map[item.productId]) map[item.productId] = [];
      map[item.productId].push(item);
    }
    return map;
  }, [cart.items]);

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
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const sections = sectionRefs.current;
    if (sections.size === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost intersecting entry to avoid rapid-fire updates
        let topEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) {
              topEntry = entry;
            }
          }
        }
        if (!topEntry) return;
        const id = topEntry.target.getAttribute("data-category-id");
        if (!id) return;
        setActiveCategoryId(id);
        // Debounce the horizontal tab scroll so rapid category changes don't interrupt
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          const tab = document.getElementById(`tab-${id}`);
          const container = tabsContainerRef.current;
          if (tab && container) {
            const tabRect = tab.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const target = container.scrollLeft + tabRect.left - containerRect.left - 16;
            container.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
          }
        }, 100);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    sections.forEach((el) => observer.observe(el));
    return () => { observer.disconnect(); if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current); };
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

      {/* ═══ HERO — Cover image + store info ═══ */}
      <div>
        {/* Cover image */}
        <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt={storeName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-(--brand-primary,#6b7280)/40 via-(--brand-primary,#6b7280)/20 to-muted/30" />
          )}
          {/* Dark gradient overlay — stronger on desktop for overlaid text */}
          <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/20 to-black/30 sm:from-black/80 sm:via-black/40 sm:to-black/20" />

          {/* Desktop: Logo + name overlaid at bottom-left */}
          <div className="absolute bottom-4 left-4 md:left-8 hidden sm:flex items-center gap-4 z-10">
            {storeLogo ? (
              <div className="size-20 rounded-2xl shadow-xl overflow-hidden flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--brand-primary, hsl(var(--primary)))" }}>
                <img src={storeLogo} alt={storeName} className="w-full h-full object-contain p-1.5" />
              </div>
            ) : (
              <div className="size-20 rounded-2xl shadow-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--brand-primary, hsl(var(--primary)))" }}>
                <span className="text-white text-3xl font-bold">{storeName.charAt(0)}</span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight drop-shadow-md">
                {storeName}
              </h1>
              {storeDescription && (
                <p className="text-sm text-white/70 mt-0.5 line-clamp-1 max-w-md drop-shadow-sm">
                  {storeDescription}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: Logo + name below image */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2 sm:hidden">
          {storeLogo ? (
            <div className="size-14 rounded-xl shadow-lg overflow-hidden flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--brand-primary, hsl(var(--primary)))" }}>
              <img src={storeLogo} alt={storeName} className="w-full h-full object-contain p-1" />
            </div>
          ) : (
            <div className="size-14 rounded-xl shadow-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--brand-primary, hsl(var(--primary)))" }}>
              <span className="text-white text-xl font-bold">{storeName.charAt(0)}</span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">
              {storeName}
            </h1>
            {storeDescription && (
              <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-1">
                {storeDescription}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ INFO BAR — Delivery, Pickup, Schedule ═══ */}
      {/* Mobile: simple row under store name */}
      <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide text-[13px] sm:hidden">
        {prepTime && (
          <div className="flex items-center gap-1 bg-muted rounded-full px-2.5 py-1 shrink-0">
            <Bike className="size-3.5 text-muted-foreground" />
            <span className="font-medium">Delivery {prepTime}-{prepTime + 10} min</span>
          </div>
        )}
        {prepTime && (
          <div className="flex items-center gap-1 bg-muted rounded-full px-2.5 py-1 shrink-0">
            <Package className="size-3.5 text-muted-foreground" />
            <span className="font-medium">Pickup {Math.max(5, prepTime - 10)}-{prepTime} min</span>
          </div>
        )}
      </div>

      {/* Desktop: info bar */}
      <div className="hidden sm:block bg-muted/50 border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-2.5 overflow-x-auto scrollbar-hide text-[13px]">
          {prepTime && (
            <div className="flex items-center gap-1.5 bg-background rounded-full px-3 py-1.5 shrink-0 border border-border">
              <Bike className="size-3.5 text-muted-foreground" />
              <span className="font-medium">Delivery {prepTime}-{prepTime + 10} min</span>
            </div>
          )}
          {prepTime && (
            <div className="flex items-center gap-1.5 bg-background rounded-full px-3 py-1.5 shrink-0 border border-border">
              <Package className="size-3.5 text-muted-foreground" />
              <span className="font-medium">Pickup {Math.max(5, prepTime - 10)}-{prepTime} min</span>
            </div>
          )}
          <button className="flex items-center gap-1.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer">
            <Info className="size-3.5" />
            <span>Restaurant details</span>
          </button>
        </div>
      </div>

      {/* ═══ SEARCH BAR ═══ */}
      <div className="px-4 mt-3 sm:mt-5 mb-2 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search in ${storeName}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 sm:h-12 rounded-xl bg-muted/50 border border-border/50 text-sm sm:text-[15px] focus-visible:ring-1 focus-visible:ring-(--brand-primary,hsl(var(--ring)))"
          />
        </div>
      </div>

      {/* ═══ STICKY — category tabs + filter ═══ */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-md">
        {/* Category tabs + filter icon */}
        {filteredCategories.length > 0 && (
          <div className="relative flex items-center max-w-2xl mx-auto">
            <div ref={tabsContainerRef} className="flex-1 flex gap-2 pl-4 pr-14 py-2 overflow-x-auto scrollbar-hide">
              {filteredCategories.map((cat) => {
                const isActive = activeCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    id={`tab-${cat.id}`}
                    className={`shrink-0 px-4 py-2 text-[13px] font-semibold whitespace-nowrap uppercase tracking-wide rounded-full transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "bg-(--brand-primary,hsl(var(--primary))) text-white shadow-sm"
                        : "bg-muted/60 text-muted-foreground/70 hover:text-foreground hover:bg-muted/80"
                    }`}
                    onClick={() => scrollToCategory(cat.id)}
                  >
                    {cat.name}
                  </button>
                );
              })}
              <div className="shrink-0 w-4" />
            </div>
            {/* Fade edge + filter button pinned right */}
            <div className="absolute right-0 top-0 bottom-0 flex items-center pr-3 pl-8 bg-linear-to-l from-background/95 from-60% to-transparent pointer-events-none">
              <Popover>
                <PopoverTrigger asChild>
                  <button className={`relative size-9 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer pointer-events-auto ${activeFilters.size > 0 ? "text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted/80"}`} style={activeFilters.size > 0 ? { background: "var(--brand-primary, hsl(var(--primary)))" } : undefined}>
                    <SlidersHorizontal className="size-4" />
                    {activeFilters.size > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-white text-[10px] font-bold flex items-center justify-center" style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}>{activeFilters.size}</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-2 pointer-events-auto">
                  {dietaryFilters.map((f) => (
                    <button
                      key={f.key}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors duration-200 cursor-pointer ${
                        activeFilters.has(f.key) ? "text-white" : "text-foreground hover:bg-muted"
                      }`}
                      style={activeFilters.has(f.key) ? { background: "var(--brand-primary, hsl(var(--primary)))" } : undefined}
                      onClick={() => toggleFilter(f.key)}
                    >
                      <f.icon className="size-4" />
                      {f.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
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
              <section className="pt-6 pb-1 px-4">
                <h2 className="text-xl font-bold tracking-tight mb-3">Popular</h2>
                <Carousel opts={{ align: "start", dragFree: true, watchDrag: true }} className="-mx-1.5">
                  <CarouselContent className="-ml-3">
                    {popularProducts.map((product) => (
                      <CarouselItem key={product.id} className="pl-3 basis-37.5 md:basis-45">
                        <PopularCard product={product} onClick={() => openProduct(product)} onQuickAdd={handleQuickAdd(product)} onQuickRemove={handleQuickRemove(product)} onIncrement={handleIncrement(product)} formatPrice={formatPrice} quantity={quantityByProduct[product.id] || 0} />
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
                className="px-4 pt-6"
              >
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-bold tracking-tight">{cat.name}</h2>
                </div>
                <div className="h-px bg-border mb-1" />
                <div className="divide-y divide-border/50">
                  {cat.products.map((product) => {
                    const variants = cartItemsByProduct[product.id] || [];
                    return (
                      <div key={product.id} className="divide-y divide-border/50">
                        <ProductCard product={product} onDetail={() => openProduct(product)} onQuickAdd={handleQuickAdd(product)} onQuickRemove={handleQuickRemove(product)} onIncrement={handleIncrement(product)} formatPrice={formatPrice} quantity={variants.length > 1 ? variants[variants.length - 1].quantity : (quantityByProduct[product.id] || 0)} modifierSummary={variants.length > 1 ? (variants[variants.length - 1].modifiers.map((m) => m.name).join(", ") || "Default") : undefined} />
                        {variants.length > 1 && variants.slice(0, -1).map((ci) => (
                          <VariantCard
                            key={ci.cartItemId}
                            product={product}
                            modifierSummary={ci.modifiers.map((m) => m.name).join(", ") || "Default"}
                            quantity={ci.quantity}
                            onEdit={() => openCartItemEdit(product, ci.cartItemId)}
                            onIncrement={(e) => { e.stopPropagation(); cart.updateQuantity(ci.cartItemId, ci.quantity + 1); }}
                            onDecrement={(e) => { e.stopPropagation(); cart.updateQuantity(ci.cartItemId, ci.quantity - 1); }}
                            formatPrice={formatPrice}
                          />
                        ))}
                      </div>
                    );
                  })}
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

      <ProductDetailSheet product={selectedProduct} editingCartItem={editingCartItem} onClose={() => { setSelectedProduct(null); setEditingCartItem(null); }} />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} tenantSlug={tenantSlug} />
    </div>
  );
};
