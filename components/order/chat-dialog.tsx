"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { selectDialogData, useDialogStore } from "@/lib/stores/dialog-store";
import { cn } from "@/lib/general/utils";

interface ChatMessage {
  id: string;
  senderType: "CUSTOMER" | "STORE";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  status: "OPEN" | "CLOSED";
  messages: ChatMessage[];
}

export function ChatDialogContent() {
  const dialogData = useDialogStore(selectDialogData) as { orderId: string; orderNumber: string } | null;
  const tenant = useTenant();
  const t = useTranslations("Chat");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversation
  useEffect(() => {
    if (!dialogData?.orderId) return;
    fetch(`/api/tenants/${tenant.slug}/orders/${dialogData.orderId}/chat`)
      .then((r) => r.json())
      .then(setConversation)
      .catch(console.error);
  }, [dialogData?.orderId, tenant.slug]);

  // Subscribe to realtime
  useEffect(() => {
    if (!conversation?.id) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`chat:${conversation.id}`)
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        setConversation((prev) =>
          prev ? { ...prev, messages: [...prev.messages, payload as ChatMessage] } : prev
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversation?.id]);

  // Scroll to bottom on new messages
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
          {conversation?.messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex", msg.senderType === "CUSTOMER" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  msg.senderType === "CUSTOMER"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {!conversation && (
            <div className="flex items-center justify-center py-10">
              <div className="size-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
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
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
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
