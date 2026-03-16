"use client";

import { useRef, useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SoundSettingsState {
  muted: boolean;
  toggleMute: () => void;
}

export const useSoundSettings = create<SoundSettingsState>()(
  persist(
    (set) => ({
      muted: false,
      toggleMute: () => set((s) => ({ muted: !s.muted })),
    }),
    { name: "admin-sound-settings" }
  )
);

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const muted = useSoundSettings((s) => s.muted);

  const playSound = useCallback(() => {
    if (muted) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/new-order.mp3");
        audioRef.current.volume = 0.7;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Browser may block autoplay — ignore
      });
    } catch {
      // Audio not supported
    }
  }, [muted]);

  return { playSound };
}
