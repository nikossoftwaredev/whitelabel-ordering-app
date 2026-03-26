import { create } from "zustand";

interface OrderNotificationStore {
  pendingOrderId: string | null;
  setPendingOrderId: (id: string) => void;
  clearPendingOrderId: () => void;
}

export const useOrderNotificationStore = create<OrderNotificationStore>(
  (set) => ({
    pendingOrderId: null,
    setPendingOrderId: (id) => set({ pendingOrderId: id }),
    clearPendingOrderId: () => set({ pendingOrderId: null }),
  })
);
