"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { StoreInfoDialog } from "@/components/order/store-info-dialog";

export const DialogProvider = () => {
  return (
    <>
      <ConfirmDialog />
      <StoreInfoDialog />
    </>
  );
};
