"use client";

import { useEffect } from "react";

/**
 * Syncs --vvh (visual viewport height) CSS variable to document root.
 * Keeps it updated as the mobile keyboard opens/closes.
 * Used by full-screen dialogs so their scroll area shrinks correctly
 * when the keyboard is covering part of the screen.
 */
export function ViewportHeightSync() {
  useEffect(() => {
    const vv = window.visualViewport;

    const sync = () => {
      const h = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty("--vvh", `${h}px`);
    };

    sync();
    vv?.addEventListener("resize", sync);
    return () => vv?.removeEventListener("resize", sync);
  }, []);

  return null;
}
