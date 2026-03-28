"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { useTenant } from "@/components/tenant-provider";
import { useAddressStore } from "@/lib/stores/address-store";

export function AddressPreloader() {
  const { data: session, status } = useSession();
  const tenant = useTenant();
  const setAddresses = useAddressStore((s) => s.setAddresses);
  const setSelectedAddress = useAddressStore((s) => s.setSelectedAddress);
  const setLoaded = useAddressStore((s) => s.setLoaded);
  const isLoaded = useAddressStore((s) => s.isLoaded);

  // Clear address data when logged out
  useEffect(() => {
    if (status === "unauthenticated") {
      setAddresses([]);
      setSelectedAddress(null);
      setLoaded(false);
    }
  }, [status, setAddresses, setSelectedAddress, setLoaded]);

  // Load addresses when logged in
  useEffect(() => {
    if (!session?.user || isLoaded) return;

    fetch(`/api/tenants/${tenant.slug}/addresses`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setAddresses(data.addresses ?? data);
      })
      .catch(() => {});
  }, [session?.user, tenant.slug, setAddresses, isLoaded]);

  return null;
}
