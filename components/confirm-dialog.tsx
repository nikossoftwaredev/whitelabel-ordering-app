"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { useDialogStore } from "@/lib/stores/dialog-store";

export const CONFIRM_DIALOG = "confirm";

interface ConfirmDialogData {
  title: string;
  description: string;
  actionLabel: string;
}

export const ConfirmDialog = () => {
  const open = useDialogStore((s) => s.currentDialog === CONFIRM_DIALOG);
  const dialogData = useDialogStore((s) => s.dialogData);
  const onSuccess = useDialogStore((s) => s.onSuccess);
  const closeDialog = useDialogStore((s) => s.closeDialog);

  const { title, description, actionLabel } =
    (dialogData as ConfirmDialogData) ?? {};

  const handleConfirm = () => {
    onSuccess?.();
    closeDialog(CONFIRM_DIALOG);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closeDialog(CONFIRM_DIALOG);
      }}
    >
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-center gap-2 sm:justify-center">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={buttonVariants({ variant: "destructive" })}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
