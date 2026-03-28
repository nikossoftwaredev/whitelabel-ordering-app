"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";

import { MessageBubble } from "@/components/chat/message-bubble";
import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatConversation, ChatMessage } from "@/lib/chat/types";
import { useChatRealtime } from "@/hooks/use-chat-realtime";
import { selectDialogData, useDialogStore } from "@/lib/stores/dialog-store";

export function ChatDialogContent() {
  const dialogData = useDialogStore(selectDialogData) as { orderId: string; orderNumber: string } | null;
  const tenant = useTenant();
  const t = useTranslations("Chat");
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dialogData?.orderId) return;
    fetch(`/api/tenants/${tenant.slug}/orders/${dialogData.orderId}/chat`)
      .then((r) => r.json())
      .then(setConversation)
      .catch(console.error);
  }, [dialogData?.orderId, tenant.slug]);

  useChatRealtime(conversation?.id, (msg: ChatMessage) => {
    setConversation((prev) => {
      if (!prev) return prev;
      if (prev.messages.some((m) => m.id === msg.id)) return prev;
      return { ...prev, messages: [...prev.messages, msg] };
    });
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !conversation || sending) return;
    setSending(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenant.slug}/chat/${conversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: input.trim() }),
        }
      );
      if (res.ok) {
        const msg = await res.json();
        setConversation((prev) =>
          prev ? { ...prev, messages: [...prev.messages, msg] } : prev
        );
        setInput("");
      }
    } finally {
      setSending(false);
    }
  };

  const isClosed = conversation?.status === "CLOSED";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">
          {t("title")}{dialogData?.orderNumber ? ` · ${dialogData.orderNumber}` : ""}
        </DialogTitle>
      </DialogHeader>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 py-3 space-y-3">
          {!conversation && (
            <div className="flex items-center justify-center py-10">
              <div className="size-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          {conversation?.messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} ownSender="CUSTOMER" />
          ))}
          {conversation?.messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">{t("empty")}</p>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {isClosed ? (
        <div className="px-4 py-3 border-t border-border shrink-0 text-center">
          <p className="text-sm text-muted-foreground">{t("closed")}</p>
        </div>
      ) : (
        <div className="flex gap-2 px-4 py-3 border-t border-border shrink-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder={t("placeholder")}
            className="flex-1 h-10 rounded-xl bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            size="icon"
            variant="brand"
            className="size-10 rounded-xl shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            <Send className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
