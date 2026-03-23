"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bike,
  Flame,
  Gift,
  Info,
  Leaf,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Store,
  WheatOff,
  X,
} from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback,useEffect, useMemo, useRef, useState } from "react";

import { STORE_INFO_DIALOG, type StoreInfoDialogData } from "@/components/order/store-info-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormatPrice } from "@/hooks/use-format-price";
import { hasActiveOffer } from "@/lib/orders/offers";
import { queryKeys } from "@/lib/query/keys";
import { useCartStore } from "@/lib/stores/cart-store";
import { useDialogStore } from "@/lib/stores/dialog-store";


import { PRODUCT_DETAIL_DIALOG } from "./product-detail-sheet";
import { QuantityStepper } from "./quantity-stepper";

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
  offerType?: string | null;
  offerPrice?: number | null;
  offerStart?: string | null;
  offerEnd?: string | null;
}

interface Category {
  id: string;
  name: string;
  nameEl: string | null;
  products: Product[];
}

interface OperatingHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
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
    phone: string | null;
    email: string | null;
    address: string | null;
    operatingHours: OperatingHour[];
  };
  categories: Category[];
  popularProductIds?: string[];
}

interface OrderMenuProps {
  tenantSlug: string;
  tenantName: string;
  logo: string | null;
}


const dietaryFilters = [
  { key: "isVegan", labelKey: "vegan", icon: Leaf },
  { key: "isVegetarian", labelKey: "vegetarian", icon: Leaf },
  { key: "isGlutenFree", labelKey: "glutenFree", icon: WheatOff },
] as const;


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
  rankBadge,
}: {
  product: Product;
  onQuickAdd: (e: React.MouseEvent) => void;
  onQuickRemove: (e: React.MouseEvent) => void;
  onIncrement: (e: React.MouseEvent) => void;
  onDetail: () => void;
  formatPrice: (cents: number) => string;
  quantity: number;
  modifierSummary?: string;
  rankBadge?: string;
}) {
  const t = useTranslations("Menu");
  const hasRequiredModifiers = product.modifierGroups.some((g) => g.required);
  return (
    <div
      className="flex gap-3 py-3 cursor-pointer group active:scale-[0.99] transition-transform duration-150"
      onClick={onDetail}
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
          {product.isVegan && <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">{t("vegan")}</span>}
          {product.isVegetarian && <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">{t("vegetarian")}</span>}
          {product.isGlutenFree && <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">{t("glutenFree")}</span>}
        </div>
        {hasActiveOffer(product) ? (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">1+1</span>
            <span className="text-[14px] font-semibold" style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}>{formatPrice(product.offerPrice!)}</span>
            <span className="text-[12px] text-muted-foreground line-through">{formatPrice(product.price * 2)}</span>
          </div>
        ) : (
          <p className="text-[14px] font-semibold mt-1.5" style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}>{formatPrice(product.price)}</p>
        )}
        {rankBadge && (
          <span className="inline-flex items-center gap-1 mt-1.5 bg-orange-500/15 text-orange-600 dark:text-orange-400 text-[12px] font-semibold px-2 py-0.5 rounded-full w-fit">
            <Flame className="size-3 fill-current" />
            {rankBadge}
          </span>
        )}
      </div>
      <div className="relative shrink-0 w-[100px] h-[100px] md:w-[130px] md:h-[130px] rounded-xl overflow-hidden bg-muted">
        {product.image ? (
          <Image src={product.image} alt={product.name} fill sizes="130px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
            <Store className="size-6 text-muted-foreground/20" />
          </div>
        )}
        {quantity > 0 ? (
          <QuantityStepper
            quantity={quantity}
            onDecrement={onQuickRemove}
            onIncrement={onIncrement}
            variant="overlay"
            className="absolute top-0 right-0 m-1 shadow-md"
          />
        ) : (
          <button
            className="absolute top-0 right-0 m-1 size-8.5 flex items-center justify-center rounded-full bg-black/80 backdrop-blur-sm shadow-md text-white cursor-pointer hover:bg-white/20 transition-colors duration-200"
            onClick={(e) => { e.stopPropagation(); (hasRequiredModifiers ? onDetail : onQuickAdd)(e); }}
          >
            <Plus className="size-4" />
          </button>
        )}
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
        {hasActiveOffer(product) ? (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">1+1</span>
            <span className="text-[14px] font-semibold" style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}>{formatPrice(product.offerPrice!)}</span>
          </div>
        ) : (
          <p className="text-[14px] font-semibold mt-1" style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}>{formatPrice(product.price)}</p>
        )}
      </div>
      <div className="relative shrink-0 w-[100px] h-[100px] md:w-[130px] md:h-[130px] rounded-xl overflow-hidden bg-muted">
        {product.image ? (
          <Image src={product.image} alt={product.name} fill sizes="130px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
            <Store className="size-6 text-muted-foreground/20" />
          </div>
        )}
        <QuantityStepper
          variant="overlay"
          quantity={quantity}
          onDecrement={onDecrement}
          onIncrement={onIncrement}
          className="absolute top-0 right-0 shadow-md m-1"
        />
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
  const t = useTranslations("Menu");
  const { data: session } = useSession();
  const formatPrice = useFormatPrice();
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const openDialog = useDialogStore((s) => s.openDialog);

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
      openDialog(PRODUCT_DETAIL_DIALOG, { product, editingCartItem: { cartItemId: last.cartItemId, quantity: last.quantity, modifiers: last.modifiers, notes: last.notes } });
    } else {
      openDialog(PRODUCT_DETAIL_DIALOG, { product });
    }
  }, [cart.items, openDialog]);

  const openCartItemEdit = useCallback((product: Product, cartItemId: string) => {
    const item = cart.items.find((i) => i.cartItemId === cartItemId);
    if (!item) return;
    openDialog(PRODUCT_DETAIL_DIALOG, { product, editingCartItem: { cartItemId: item.cartItemId, quantity: item.quantity, modifiers: item.modifiers, notes: item.notes } });
  }, [cart.items, openDialog]);

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

  const { data: loyalty } = useQuery<{
    enabled: boolean;
    requiredOrders: number;
    rewardAmount: number;
    currentProgress: number;
    isEligible: boolean;
  }>({
    queryKey: ["loyalty", tenantSlug],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantSlug}/loyalty`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!session?.user,
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
    if (!data?.categories || !data.popularProductIds?.length) return [];
    const allProducts = data.categories.flatMap((c) => c.products);
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    return data.popularProductIds
      .map((id) => productMap.get(id))
      .filter((p): p is Product => !!p);
  }, [data?.categories, data?.popularProductIds]);

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
      const isBogo = hasActiveOffer(product);
      cart.addItem({
        productId: product.id, productName: product.name, productImage: product.image,
        basePrice: product.price, quantity: isBogo ? 2 : 1, modifiers: defaultModifiers, notes: "",
        ...(isBogo && { offerType: product.offerType, offerPrice: product.offerPrice }),
      });
    },
    [cart]
  );

  if (data?.tenant?.isPaused) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <Store className="size-16 text-muted-foreground/30" />
        <h1 className="text-2xl font-bold">{t("temporarilyClosed")}</h1>
        <p className="text-muted-foreground">{t("temporarilyClosedDesc")}</p>
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
            <Image
              src={coverImage}
              alt={storeName}
              fill
              priority
              sizes="100vw"
              className="object-cover"
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

      {/* ═══ INFO BAR — Delivery, Pickup, Schedule, Loyalty ═══ */}
      {/* Mobile: simple row under store name */}
      <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide text-[13px] sm:hidden">
        {prepTime && (
          <div className="flex items-center gap-1 bg-muted rounded-full px-2.5 py-1 shrink-0">
            <Bike className="size-3.5 text-muted-foreground" />
            <span className="font-medium">{t("delivery", { min: prepTime, max: prepTime + 10 })}</span>
          </div>
        )}
        {prepTime && (
          <div className="flex items-center gap-1 bg-muted rounded-full px-2.5 py-1 shrink-0">
            <Package className="size-3.5 text-muted-foreground" />
            <span className="font-medium">{t("pickup", { min: Math.max(5, prepTime - 10), max: prepTime })}</span>
          </div>
        )}
        {loyalty?.enabled && (
          <div className="flex items-center gap-1 bg-muted rounded-full px-2.5 py-1 shrink-0">
            <Gift className="size-3.5 text-amber-500" />
            <span className="font-medium">{t("loyaltyEarnedCoupon", { amount: formatPrice(loyalty.rewardAmount) })}</span>
            <span className="font-semibold text-amber-500">{t("loyaltyProgressLabel", { current: loyalty.currentProgress, total: loyalty.requiredOrders })}</span>
          </div>
        )}
      </div>

      {/* Desktop: info bar */}
      <div className="hidden sm:block bg-muted/50 border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-2.5 overflow-x-auto scrollbar-hide text-[13px]">
          {prepTime && (
            <div className="flex items-center gap-1.5 bg-background rounded-full px-3 py-1.5 shrink-0 border border-border">
              <Bike className="size-3.5 text-muted-foreground" />
              <span className="font-medium">{t("delivery", { min: prepTime, max: prepTime + 10 })}</span>
            </div>
          )}
          {prepTime && (
            <div className="flex items-center gap-1.5 bg-background rounded-full px-3 py-1.5 shrink-0 border border-border">
              <Package className="size-3.5 text-muted-foreground" />
              <span className="font-medium">{t("pickup", { min: Math.max(5, prepTime - 10), max: prepTime })}</span>
            </div>
          )}
          {loyalty?.enabled && (
            <div className="flex items-center gap-1.5 bg-background rounded-full px-3 py-1.5 shrink-0 border border-border">
              <Gift className="size-3.5 text-amber-500" />
              <span className="font-medium">{t("loyaltyEarnedCoupon", { amount: formatPrice(loyalty.rewardAmount) })}</span>
              <span className="font-semibold text-amber-500">{t("loyaltyProgressLabel", { current: loyalty.currentProgress, total: loyalty.requiredOrders })}</span>
            </div>
          )}
          <button
            onClick={() => openDialog(STORE_INFO_DIALOG, {
              storeName,
              description: data?.tenant.description,
              phone: data?.tenant.phone,
              email: data?.tenant.email,
              address: data?.tenant.address,
              operatingHours: data?.tenant.operatingHours,
            } satisfies StoreInfoDialogData)}
            className="flex items-center gap-1.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
          >
            <Info className="size-3.5" />
            <span>{t("restaurantDetails")}</span>
          </button>
        </div>
      </div>

      {/* ═══ SEARCH BAR ═══ */}
      <div className="px-4 mt-3 sm:mt-5 mb-2 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="menu-search"
            placeholder={t("searchIn", { storeName })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-9 h-10 sm:h-12 rounded-xl bg-muted/50 border border-border/50 text-sm sm:text-[15px] focus-visible:ring-1 focus-visible:ring-(--brand-primary,hsl(var(--ring)))"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 transition-colors cursor-pointer"
            >
              <X className="size-3 text-foreground" />
            </button>
          )}
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
                      {t(f.labelKey)}
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
            <p className="text-muted-foreground">{t("noProducts")}</p>
          </div>
        ) : (
          <>
            {/* Popular section */}
            {!search && activeFilters.size === 0 && popularProducts.length > 0 && (
              <section className="px-4 pt-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-bold tracking-tight">{t("popular")}</h2>
                </div>
                <div className="h-px bg-border mb-1" />
                <div className="divide-y divide-border/50">
                  {popularProducts.map((product, index) => {
                    const variants = cartItemsByProduct[product.id] || [];
                    return (
                      <div key={product.id} className="divide-y divide-border/50">
                        <ProductCard
                          product={product}
                          onDetail={() => openProduct(product)}
                          onQuickAdd={handleQuickAdd(product)}
                          onQuickRemove={handleQuickRemove(product)}
                          onIncrement={handleIncrement(product)}
                          formatPrice={formatPrice}
                          quantity={variants.length > 1 ? variants[variants.length - 1].quantity : (quantityByProduct[product.id] || 0)}
                          modifierSummary={variants.length > 1 ? (variants[variants.length - 1].modifiers.map((m) => m.name).join(", ") || "Default") : undefined}
                          rankBadge={index < 3 ? t("rankInOrders", { rank: index + 1 }) : undefined}
                        />
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
            variant="brand"
            className="w-full flex items-center gap-3 h-14 px-5 rounded-2xl shadow-xl"
            onClick={() => openDialog("cart")}
          >
            <span className="flex items-center justify-center size-7 rounded-lg bg-white/20 text-sm font-bold tabular-nums">{itemCount}</span>
            <span className="flex-1 text-left font-semibold text-[15px]">{t("viewCart")}</span>
            <span className="font-bold text-[15px] tabular-nums">{formatPrice(subtotal)}</span>
          </Button>
        </div>
      )}



    </div>
  );
};
