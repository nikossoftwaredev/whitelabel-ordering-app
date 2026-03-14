import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartItemModifier {
  modifierOptionId: string;
  name: string;
  priceAdjustment: number;
}

interface CartItem {
  cartItemId: string;
  productId: string;
  productName: string;
  productImage: string | null;
  basePrice: number;
  quantity: number;
  modifiers: CartItemModifier[];
  notes: string;
  totalPrice: number;
}

interface CartStore {
  items: CartItem[];
  tenantSlug: string;
  addItem: (item: Omit<CartItem, "cartItemId" | "totalPrice">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setTenantSlug: (slug: string) => void;
  itemCount: () => number;
  subtotal: () => number;
}

const calcTotal = (item: Omit<CartItem, "totalPrice" | "cartItemId">) => {
  const modifierTotal = item.modifiers.reduce(
    (sum, m) => sum + m.priceAdjustment,
    0
  );
  return (item.basePrice + modifierTotal) * item.quantity;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      tenantSlug: "",
      addItem: (item) => {
        const cartItemId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set((state) => ({
          items: [
            ...state.items,
            { ...item, cartItemId, totalPrice: calcTotal(item) },
          ],
        }));
      },
      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.cartItemId !== cartItemId),
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
        } else {
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
