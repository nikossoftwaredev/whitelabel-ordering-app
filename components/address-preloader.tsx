"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { useTenant } from "@/components/tenant-provider";
import { useAddressStore } from "@/lib/stores/address-store";

export function AddressPreloader() {
  const { data: session } = useSession();
  const tenant = useTenant();
  const setAddresses = useAddressStore((s) => s.setAddresses);
  const isLoaded = useAddressStore((s) => s.isLoaded);

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
