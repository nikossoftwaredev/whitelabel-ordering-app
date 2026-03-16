"use client";

import { toast } from "sonner";

import { CONFIRM_DIALOG } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useDialogStore } from "@/lib/stores/dialog-store";

export const ConfirmDialogExample = () => {
  const { openDialog } = useDialogStore();

  return (
    <Button
      variant="destructive"
      onClick={() =>
        openDialog(
          CONFIRM_DIALOG,
          {
            title: "Delete item?",
            description: "This action cannot be undone.",
            actionLabel: "Delete",
          },
          () => toast.success("Item deleted!"),
        )
      }
    >
      Test Confirm Dialog
    </Button>
  );
};
