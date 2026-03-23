"use client";

import { useEffect } from "react";

import { ConfirmContent } from "@/components/confirm-dialog";
import { AddressManagerContent } from "@/components/order/address-manager-sheet";
import { AuthContent } from "@/components/order/auth-dialog";
import { CartContent } from "@/components/order/cart-sheet";
import { ProductDetailContent } from "@/components/order/product-detail-sheet";
import { StoreInfoContent } from "@/components/order/store-info-dialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  selectCurrentDialog,
  selectStackDepth,
  useDialogStore,
} from "@/lib/stores/dialog-store";

export const DIALOG_KEYS = {
  CONFIRM: "confirm",
  STORE_INFO: "store-info",
  CART: "cart",
  PRODUCT_DETAIL: "product-detail",
  AUTH: "auth",
  ADDRESS_MANAGER: "address-manager",
} as const;

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
        showCloseButton
        onBack={stackDepth > 1 ? goBack : undefined}
        onCloseAll={closeAll}
      >
        {currentDialog === DIALOG_KEYS.CONFIRM && <ConfirmContent />}
        {currentDialog === DIALOG_KEYS.STORE_INFO && <StoreInfoContent />}
        {currentDialog === DIALOG_KEYS.AUTH && <AuthContent />}
        {currentDialog === DIALOG_KEYS.ADDRESS_MANAGER && <AddressManagerContent />}
        {currentDialog === DIALOG_KEYS.CART && <CartContent />}
        {currentDialog === DIALOG_KEYS.PRODUCT_DETAIL && <ProductDetailContent />}
      </DialogContent>
    </Dialog>
  );
};
