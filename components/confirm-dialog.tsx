"use client";

import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  selectDialogData,
  selectOnSuccess,
  selectStackDepth,
  useDialogStore,
} from "@/lib/stores/dialog-store";

export const CONFIRM_DIALOG = "confirm";

interface ConfirmDialogData {
  title: string;
  description: string;
  actionLabel: string;
}

export const ConfirmContent = () => {
  const dialogData = useDialogStore(selectDialogData);
  const onSuccess = useDialogStore(selectOnSuccess);
  const stackDepth = useDialogStore(selectStackDepth);
  const goBack = useDialogStore((s) => s.goBack);
  const closeAll = useDialogStore((s) => s.closeAll);

  const { title, description, actionLabel } =
    (dialogData as ConfirmDialogData) ?? {};

  const handleConfirm = () => {
    onSuccess?.();
    if (stackDepth > 1) {
      goBack();
    } else {
      closeAll();
    }
  };

  const handleCancel = () => {
    if (stackDepth > 1) {
      goBack();
    } else {
      closeAll();
    }
  };

  return (
    <>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription className="mt-1">{description}</DialogDescription>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleConfirm}>
          {actionLabel}
        </Button>
      </div>
    </>
  );
};
