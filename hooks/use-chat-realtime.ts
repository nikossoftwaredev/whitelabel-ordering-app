"use client";

import { useEffect } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChatMessage } from "@/lib/chat/types";

/**
 * Subscribes to Supabase Realtime on chat:{conversationId}.
 * Calls onNewMessage for each incoming broadcast — deduplicated by message ID.
 */
export function useChatRealtime(
  conversationId: string | null | undefined,
  onNewMessage: (msg: ChatMessage) => void,
) {
  useEffect(() => {
    if (!conversationId) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        onNewMessage(payload as ChatMessage);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // onNewMessage intentionally excluded — callers should pass a stable ref/callback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);
}
