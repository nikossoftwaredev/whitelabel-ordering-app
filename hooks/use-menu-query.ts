"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import type { MenuData } from "@/types/menu";

export function useMenuQuery(tenantSlug: string) {
  return useQuery<MenuData>({
    queryKey: queryKeys.menu.all(tenantSlug),
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantSlug}/menu`);
      if (!res.ok) throw new Error("Failed to fetch menu");
      return res.json();
    },
  });
}
