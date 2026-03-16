import { useCallback } from "react";
import { useTenant } from "@/components/tenant-provider";
import { formatPrice } from "@/lib/general/formatters";

/**
 * Returns a formatPrice function bound to the current tenant's currency.
 * Use this in client components instead of calling formatPrice directly.
 */
export function useFormatPrice() {
  const { currency } = useTenant();
  return useCallback(
    (cents: number) => formatPrice(cents, currency),
    [currency]
  );
}
