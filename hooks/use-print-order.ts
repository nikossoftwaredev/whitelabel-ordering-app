import { useCallback, useState } from "react";

import type { ReceiptData } from "@/components/admin/orders/thermal-receipt";
import type { Order } from "@/components/admin/orders/types";

/**
 * Hook that populates the #thermal-receipt div and calls window.print().
 * Dispatches a "print-receipt" CustomEvent which ThermalReceiptMount listens to.
 *
 * Usage:
 *   const { printOrder, isPrinting } = usePrintOrder(storeName, currency);
 *   <Button onClick={() => printOrder(order)}>Print</Button>
 */
export function usePrintOrder(storeName: string, currency: string) {
  const [isPrinting, setIsPrinting] = useState(false);

  const buildReceiptData = useCallback(
    (order: Order): ReceiptData => ({
      storeName,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      createdAt: order.createdAt,
      scheduledFor: order.scheduledFor,
      items: order.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        modifiers: item.modifiers,
      })),
      subtotal: order.items.reduce(
        (sum, item) =>
          sum +
          item.quantity *
            (item.unitPrice +
              item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0)),
        0,
      ),
      discount: order.discount,
      promoDiscount: order.promoDiscount,
      couponDiscount: order.couponDiscount,
      groupDiscount: order.groupDiscount,
      groupDiscountName: order.groupDiscountName,
      promoCode: order.promoCode,
      tipAmount: order.tipAmount,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerName: order.customerName,
      customerPhone: order.customer?.phone ?? null,
      deliveryAddress: order.deliveryAddress,
      customerNote: order.customerNote,
      currency,
    }),
    [storeName, currency],
  );

  const printOrder = useCallback(
    (order: Order) => {
      setIsPrinting(true);

      const receiptData = buildReceiptData(order);

      // Dispatch event so ThermalReceiptMount (in admin layout) can update the DOM
      window.dispatchEvent(
        new CustomEvent("print-receipt", { detail: receiptData }),
      );

      // Give React two animation frames to re-render the receipt, then print
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.print();
          setIsPrinting(false);
        });
      });
    },
    [buildReceiptData],
  );

  return { printOrder, isPrinting };
}
