"use client";

import { Loader2 } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  selectCurrentDialog,
  selectStackDepth,
  useDialogStore,
} from "@/lib/stores/dialog-store";

const ConfirmContent = lazy(() =>
  import("@/components/confirm-dialog").then((m) => ({ default: m.ConfirmContent }))
);
const StoreInfoContent = lazy(() =>
  import("@/components/order/store-info-dialog").then((m) => ({ default: m.StoreInfoContent }))
);
const AuthContent = lazy(() =>
  import("@/components/order/auth-dialog").then((m) => ({ default: m.AuthContent }))
);
const AddressManagerContent = lazy(() =>
  import("@/components/order/address-manager-sheet").then((m) => ({ default: m.AddressManagerContent }))
);
const CartContent = lazy(() =>
  import("@/components/order/cart-sheet").then((m) => ({ default: m.CartContent }))
);
const ProductDetailContent = lazy(() =>
  import("@/components/order/product-detail-sheet").then((m) => ({ default: m.ProductDetailContent }))
);
const CouponModalContent = lazy(() =>
  import("@/components/order/checkout/coupon-modal").then((m) => ({ default: m.CouponModalContent }))
);
const PaymentModalContent = lazy(() =>
  import("@/components/order/checkout/payment-modal").then((m) => ({ default: m.PaymentModalContent }))
);

export const DIALOG_KEYS = {
  CONFIRM: "confirm",
  STORE_INFO: "store-info",
  CART: "cart",
  PRODUCT_DETAIL: "product-detail",
  AUTH: "auth",
  ADDRESS_MANAGER: "address-manager",
  COUPON_MODAL: "coupon-modal",
  PAYMENT_MODAL: "payment-modal",
} as const;

function DialogFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <DialogTitle className="sr-only">Loading</DialogTitle>
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export const DialogProvider = () => {
  const currentDialog = useDialogStore(selectCurrentDialog);
  const stackDepth = useDialogStore(selectStackDepth);
  const goBack = useDialogStore((s) => s.goBack);
  const closeAll = useDialogStore((s) => s.closeAll);
  const closeDialog = useDialogStore((s) => s.closeDialog);

  useEffect(() => {
    const handlePopState = () => {
      const { stack } = useDialogStore.getState();
      if (stack.length > 0) {
        closeDialog();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [closeDialog]);

  if (!currentDialog) return null;

  return (
    <Dialog
      open={!!currentDialog}
      onOpenChange={(open) => {
        if (!open) closeAll();
      }}
    >
      <DialogContent
        className="p-0"
        showCloseButton
        onBack={stackDepth > 1 ? goBack : undefined}
        onCloseAll={closeAll}
      >
        <Suspense fallback={<DialogFallback />}>
          {currentDialog === DIALOG_KEYS.CONFIRM && <ConfirmContent />}
          {currentDialog === DIALOG_KEYS.STORE_INFO && <StoreInfoContent />}
          {currentDialog === DIALOG_KEYS.AUTH && <AuthContent />}
          {currentDialog === DIALOG_KEYS.ADDRESS_MANAGER && <AddressManagerContent />}
          {currentDialog === DIALOG_KEYS.CART && <CartContent />}
          {currentDialog === DIALOG_KEYS.PRODUCT_DETAIL && <ProductDetailContent />}
          {currentDialog === DIALOG_KEYS.COUPON_MODAL && <CouponModalContent />}
          {currentDialog === DIALOG_KEYS.PAYMENT_MODAL && <PaymentModalContent />}
        </Suspense>
      </DialogContent>
    </Dialog>
  );
};
