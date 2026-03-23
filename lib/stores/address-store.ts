import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Address {
  id: string;
  label: string;
  street: string;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
}

interface AddressStore {
  addresses: Address[];
  selectedAddress: Address | null;
  isLoaded: boolean;

  setAddresses: (addresses: Address[]) => void;
  addAddress: (address: Address) => void;
  removeAddress: (id: string) => void;
  updateAddress: (id: string, updates: Partial<Address>) => void;
  setSelectedAddress: (address: Address | null) => void;
  setLoaded: (loaded: boolean) => void;
}

export const useAddressStore = create<AddressStore>()(
  persist(
    (set, get) => ({
      addresses: [],
      selectedAddress: null,
      isLoaded: false,

      setAddresses: (addresses) => set({ addresses, isLoaded: true }),
      addAddress: (address) =>
        set({ addresses: [...get().addresses, address] }),
      removeAddress: (id) =>
        set((state) => {
          const remaining = state.addresses.filter((a) => a.id !== id);
          return {
            addresses: remaining,
            selectedAddress:
              state.selectedAddress?.id === id
                ? remaining[0] ?? null
                : state.selectedAddress,
          };
        }),
      updateAddress: (id, updates) =>
        set((state) => ({
          addresses: state.addresses.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
          selectedAddress:
            state.selectedAddress?.id === id
              ? { ...state.selectedAddress, ...updates }
              : state.selectedAddress,
        })),
      setSelectedAddress: (address) => set({ selectedAddress: address }),
      setLoaded: (loaded) => set({ isLoaded: loaded }),
    }),
    {
      name: "selected-address",
      partialize: (state) => ({
        selectedAddress: state.selectedAddress,
      }),
    }
  )
);
