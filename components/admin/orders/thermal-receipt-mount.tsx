"use client";

import { useEffect, useState } from "react";

import type { ReceiptData } from "./thermal-receipt";
import { ThermalReceipt } from "./thermal-receipt";

/**
 * Mounts the hidden ThermalReceipt in the DOM.
 * Listens for "print-receipt" CustomEvents dispatched by usePrintOrder.
 * Place this once in the admin layout.
 */
export function ThermalReceiptMount() {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      setReceiptData((e as CustomEvent<ReceiptData>).detail);
    };
    window.addEventListener("print-receipt", handler);
    return () => window.removeEventListener("print-receipt", handler);
  }, []);

  return <ThermalReceipt data={receiptData} />;
}
