"use client";

import { useEffect } from "react";

/**
 * Keeps --vvh in sync so full-screen dialogs shrink correctly
 * when the mobile keyboard covers part of the screen.
 */
export function ViewportHeightSync() {
  useEffect(() => {
    const vv = window.visualViewport;

    const sync = () => {
      const next = `${vv ? vv.height : window.innerHeight}px`;
      if (document.documentElement.style.getPropertyValue("--vvh") !== next) {
        document.documentElement.style.setProperty("--vvh", next);
      }
    };

    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync); // iOS fires scroll, not resize, on keyboard open
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
    };
  }, []);

  return null;
}
