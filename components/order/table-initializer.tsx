"use client";
import { useEffect } from "react";
import { useCheckoutStore } from "@/lib/stores/checkout-store";

export function TableInitializer({ tableNumber }: { tableNumber: string | null }) {
  const setTableNumber = useCheckoutStore((s) => s.setTableNumber);
  const setOrderType = useCheckoutStore((s) => s.setOrderType);

  useEffect(() => {
    if (tableNumber) {
      setTableNumber(tableNumber);
      setOrderType("DINE_IN");
    }
  }, [tableNumber, setTableNumber, setOrderType]);

  return null;
}
