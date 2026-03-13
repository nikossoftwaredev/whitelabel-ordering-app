import { create } from "zustand";

interface DialogStore {
  currentDialog: string | null;
  dialogData: unknown;
  onSuccess?: () => void;
  openDialog: (key: string, data?: unknown, onSuccess?: () => void) => void;
  closeDialog: (key: string) => void;
}

export const useDialogStore = create<DialogStore>((set) => ({
  currentDialog: null,
  dialogData: null,
  onSuccess: undefined,
  openDialog: (key, data, onSuccess) =>
    set({
      currentDialog: key,
      dialogData: data ?? null,
      onSuccess,
    }),
  closeDialog: (key) =>
    set((state) =>
      state.currentDialog === key
        ? { currentDialog: null, dialogData: null, onSuccess: undefined }
        : state,
    ),
}));
