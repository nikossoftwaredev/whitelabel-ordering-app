import { useQuery } from "@tanstack/react-query";

import { useTenant } from "@/components/tenant-provider";
import { queryKeys } from "@/lib/query/keys";

interface StoreStatus {
  isOpen: boolean;
  isPaused: boolean;
  reason?: string;
  opensAt?: string;
  currentTime?: string;
  currentDay?: string;
}

export function useStoreStatus() {
  const tenant = useTenant();

  const query = useQuery<StoreStatus>({
    queryKey: queryKeys.storeStatus(tenant.slug),
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenant.slug}/status`);
      if (!res.ok) throw new Error("Failed to fetch store status");
      return res.json();
    },
    refetchInterval: 60_000, // Re-check every minute
    staleTime: 30_000,
  });

  return {
    ...query,
    /** True when the store is confirmed closed (false while loading) */
    isClosed: query.data ? !query.data.isOpen : false,
  };
}
