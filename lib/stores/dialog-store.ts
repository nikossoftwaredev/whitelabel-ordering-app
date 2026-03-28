import { create } from "zustand";

interface DialogEntry {
  key: string;
  data: unknown;
  onSuccess?: () => void;
}

interface DialogStore {
  stack: DialogEntry[];
  localBackHandler: (() => void) | null;
  openDialog: (key: string, data?: unknown, onSuccess?: () => void) => void;
  closeDialog: () => void;
  goBack: () => void;
  closeAll: () => void;
  setLocalBackHandler: (handler: (() => void) | null) => void;
}

export const useDialogStore = create<DialogStore>((set, get) => ({
  stack: [],
  localBackHandler: null,
  setLocalBackHandler: (handler) => set({ localBackHandler: handler }),

  openDialog: (key, data, onSuccess) => {
    set((state) => ({
      stack: [...state.stack, { key, data: data ?? null, onSuccess }],
    }));
    if (typeof window !== "undefined") {
      history.pushState({ dialogStack: true }, "");
    }
  },

  closeDialog: () => {
    set((state) => ({
      stack: state.stack.slice(0, -1),
    }));
  },

  goBack: () => {
    if (typeof window !== "undefined" && get().stack.length > 0) {
      history.back();
    }
  },

  closeAll: () => {
    const depth = get().stack.length;
    set({ stack: [], localBackHandler: null });
    if (typeof window !== "undefined" && depth > 0) {
      history.go(-depth);
    }
  },
}));

// Selector helpers
export const selectCurrentDialog = (s: DialogStore) =>
  s.stack.length > 0 ? s.stack[s.stack.length - 1].key : null;

export const selectDialogData = (s: DialogStore) =>
  s.stack.length > 0 ? s.stack[s.stack.length - 1].data : null;

export const selectOnSuccess = (s: DialogStore) =>
  s.stack.length > 0 ? s.stack[s.stack.length - 1].onSuccess : undefined;

export const selectStackDepth = (s: DialogStore) => s.stack.length;
