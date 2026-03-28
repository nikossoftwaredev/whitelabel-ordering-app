"use client";

import { cn } from "@/lib/general/utils";
import { ChatMessage } from "@/lib/chat/types";

interface MessageBubbleProps {
  msg: ChatMessage;
  /** Which senderType is "mine" (right-aligned, primary colour) */
  ownSender: "CUSTOMER" | "STORE";
}

export function MessageBubble({ msg, ownSender }: MessageBubbleProps) {
  const isOwn = msg.senderType === ownSender;
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        {msg.content}
      </div>
    </div>
  );
}
