import { create } from "zustand";
import { persist } from "zustand/middleware";

import { calcBogoTotal, OFFER_TYPE_BOGO } from "@/lib/orders/offers";

interface CartItemModifier {
  modifierOptionId: string;
  name: string;
  priceAdjustment: number;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  productName: string;
  productImage: string | null;
  basePrice: number;
  quantity: number;
  modifiers: CartItemModifier[];
  notes: string;
  totalPrice: number;
  offerType?: string | null;
  offerPrice?: number | null;
}

interface CartStore {
  items: CartItem[];
  tenantSlug: string;
  addItem: (item: Omit<CartItem, "cartItemId" | "totalPrice">) => void;
  removeItem: (cartItemId: string) => void;
  updateItem: (cartItemId: string, updates: Partial<Pick<CartItem, "quantity" | "modifiers" | "notes">>) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setTenantSlug: (slug: string) => void;
  itemCount: () => number;
  subtotal: () => number;
}

const modifierKey = (modifiers: CartItemModifier[]) =>
  modifiers
    .map((m) => m.modifierOptionId)
    .sort()
    .join(",");

const calcTotal = (item: Omit<CartItem, "totalPrice" | "cartItemId">) => {
  const modifierTotal = item.modifiers.reduce(
    (sum, m) => sum + m.priceAdjustment,
    0
  );

  if (item.offerType === OFFER_TYPE_BOGO && item.offerPrice != null && item.quantity >= 2) {
    return calcBogoTotal(item.quantity, item.offerPrice, item.basePrice, modifierTotal);
  }

  return (item.basePrice + modifierTotal) * item.quantity;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      tenantSlug: "",
      addItem: (item) => {
        const incomingKey = modifierKey(item.modifiers);

        set((state) => {
          const existingIndex = state.items.findIndex(
            (existing) =>
              existing.productId === item.productId &&
              modifierKey(existing.modifiers) === incomingKey &&
              existing.offerType === item.offerType
          );

          if (existingIndex !== -1) {
            const updated = state.items.map((existing, i) => {
              if (i !== existingIndex) return existing;
              const merged = { ...existing, quantity: existing.quantity + item.quantity };
              return { ...merged, totalPrice: calcTotal(merged) };
            });
            return { items: updated };
          }

          const cartItemId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          return {
            items: [...state.items, { ...item, cartItemId, totalPrice: calcTotal(item) }],
          };
        });
      },
      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.cartItemId !== cartItemId),
        }));
      },
      updateItem: (cartItemId, updates) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.cartItemId !== cartItemId) return item;
            const updated = { ...item, ...updates };
            return { ...updated, totalPrice: calcTotal(updated) };
          }),
        }));
      },
      updateQuantity: (cartItemId, quantity) => {
        if (quantity < 1) {
          get().removeItem(cartItemId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId
              ? {
                  ...item,
                  quantity,
                  totalPrice: calcTotal({ ...item, quantity }),
                }
              : item
          ),
        }));
      },
      clearCart: () => set({ items: [] }),
      setTenantSlug: (slug) => {
        const current = get().tenantSlug;
        if (current && current !== slug) {
          // Different tenant — clear cart
          set({ items: [], tenantSlug: slug });
        } else if (current !== slug) {
          set({ tenantSlug: slug });
        }
      },
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.totalPrice, 0),
    }),
    {
      name: "ordering-cart",
    }
  )
);
