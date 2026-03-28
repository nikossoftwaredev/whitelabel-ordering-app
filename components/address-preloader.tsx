"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { useTenant } from "@/components/tenant-provider";
import { type Address, useAddressStore } from "@/lib/stores/address-store";
import { useCartStore } from "@/lib/stores/cart-store";

export function AddressPreloader() {
  const { data: session, status } = useSession();
  const tenant = useTenant();
  const setAddresses = useAddressStore((s) => s.setAddresses);
  const setSelectedAddress = useAddressStore((s) => s.setSelectedAddress);
  const setLoaded = useAddressStore((s) => s.setLoaded);
  const isLoaded = useAddressStore((s) => s.isLoaded);
  const clearCart = useCartStore((s) => s.clearCart);

  // Clear session-specific data when logged out
  useEffect(() => {
    if (status === "unauthenticated") {
      setAddresses([]);
      setSelectedAddress(null);
      setLoaded(false);
      clearCart();
    }
  }, [status, setAddresses, setSelectedAddress, setLoaded, clearCart]);

  // Load addresses when logged in
  useEffect(() => {
    if (!session?.user || isLoaded) return;

    fetch(`/api/tenants/${tenant.slug}/addresses`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const addresses: Address[] = data.addresses ?? data;
        setAddresses(addresses);
        // Auto-select default (or first) address if none selected yet
        if (!useAddressStore.getState().selectedAddress && addresses.length > 0) {
          setSelectedAddress(addresses.find((a) => a.isDefault) ?? addresses[0]);
        }
      })
      .catch(() => {});
  }, [session?.user, tenant.slug, isLoaded, setAddresses, setSelectedAddress]);

  return null;
}
