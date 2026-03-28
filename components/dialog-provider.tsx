"use client";

import { lazy, Suspense, useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
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
const ReorderContent = lazy(() =>
  import("@/components/order/reorder-dialog").then((m) => ({ default: m.ReorderContent }))
);
const ChatDialogContent = lazy(() =>
  import("@/components/order/chat-dialog").then((m) => ({ default: m.ChatDialogContent }))
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
  REORDER: "reorder",
  CHAT: "chat",
} as const;

/** Dialogs that use the compact variant (auto-height, no close button) */
const COMPACT_DIALOGS = new Set<string>([DIALOG_KEYS.CONFIRM]);

function DialogFallback() {
  return (
    <div className="flex flex-col flex-1">
      <DialogHeader>
        <DialogTitle className="sr-only">Loading</DialogTitle>
        <div className="h-5 w-36 rounded-md bg-muted animate-pulse" />
      </DialogHeader>
      <div className="px-5 py-4 space-y-4 flex-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-14 rounded-lg bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-20 rounded-md bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
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

  const isCompact = COMPACT_DIALOGS.has(currentDialog!);

  if (!currentDialog) return null;

  return (
    <Dialog
      open={!!currentDialog}
      onOpenChange={(open) => {
        if (!open) closeAll();
      }}
    >
      <DialogContent
        className={isCompact ? undefined : currentDialog === DIALOG_KEYS.AUTH ? "p-0 sm:h-auto" : "p-0"}
        variant={isCompact ? "compact" : "responsive"}
        size={currentDialog === DIALOG_KEYS.PRODUCT_DETAIL ? "sm" : "md"}
        showCloseButton={!isCompact}
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
          {currentDialog === DIALOG_KEYS.REORDER && <ReorderContent />}
          {currentDialog === DIALOG_KEYS.CHAT && <ChatDialogContent />}
        </Suspense>
      </DialogContent>
    </Dialog>
  );
};
