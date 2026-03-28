"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

import { MessageBubble } from "@/components/chat/message-bubble";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatRealtime } from "@/hooks/use-chat-realtime";
import { ChatMessage } from "@/lib/chat/types";

interface Props {
  tenantId: string;
  conversationId: string;
  orderNumber: string;
  status: "OPEN" | "CLOSED";
  onClose: () => void;
  onConversationClosed: () => void;
}

export function AdminChatConversation({
  tenantId,
  conversationId,
  orderNumber,
  status: initStatus,
  onClose,
  onConversationClosed,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"OPEN" | "CLOSED">(initStatus);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/admin/${tenantId}/chat/${conversationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) { setMessages(data.messages ?? []); setStatus(data.status); }
      })
      .catch(console.error);
  }, [tenantId, conversationId]);

  useChatRealtime(conversationId, (msg: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/${tenantId}/chat/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setInput("");
      }
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    setClosing(true);
    const res = await fetch(`/api/admin/${tenantId}/chat/${conversationId}`, { method: "PATCH" });
    setClosing(false);
    if (res.ok) { setStatus("CLOSED"); onConversationClosed(); }
  };

  const isClosed = status === "CLOSED";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <p className="font-semibold text-sm">Order {orderNumber}</p>
          {isClosed && <p className="text-xs text-muted-foreground">Closed</p>}
        </div>
        <div className="flex items-center gap-2">
          {!isClosed && (
            <Button variant="outline" size="sm" onClick={handleClose} disabled={closing}>
              {closing ? "Closing…" : "Close chat"}
            </Button>
          )}
          <button onClick={onClose} className="size-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors duration-300">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0" viewportClassName="!overflow-y-scroll">
        <div className="px-4 py-3 space-y-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} ownSender="STORE" />
          ))}
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No messages yet</p>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {!isClosed && (
        <div className="flex gap-2 px-4 py-3 border-t border-border shrink-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Type a reply…"
            className="flex-1 h-10 rounded-xl bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button size="icon" variant="brand" className="size-10 rounded-xl shrink-0" onClick={handleSend} disabled={!input.trim() || sending}>
            <Send className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
