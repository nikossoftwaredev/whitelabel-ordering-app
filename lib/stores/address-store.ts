import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Address {
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
  selectedAddress: Address | null;
  setSelectedAddress: (address: Address | null) => void;
}

export const useAddressStore = create<AddressStore>()(
  persist(
    (set) => ({
      selectedAddress: null,
      setSelectedAddress: (address) => set({ selectedAddress: address }),
    }),
    {
      name: "selected-address",
    }
  )
);
