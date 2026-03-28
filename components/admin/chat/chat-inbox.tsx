"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AdminChatConversation } from "./chat-conversation";
import { cn } from "@/lib/general/utils";

interface ConversationSummary {
  id: string;
  status: "OPEN" | "CLOSED";
  updatedAt: string;
  order: { orderNumber: string; status: string; total: number };
  messages: { content: string; senderType: string }[];
  customer: { user: { name: string | null } } | null;
}

export function AdminChatInbox({ tenantId }: { tenantId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [], refetch } = useQuery<ConversationSummary[]>(
    {
      queryKey: ["admin-chat", tenantId],
      queryFn: () =>
        fetch(`/api/admin/${tenantId}/chat`).then((r) => r.json()),
      refetchInterval: 30000,
    },
  );

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const openCount = conversations.filter((c) => c.status === "OPEN").length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar list */}
      <div
        className={cn(
          "flex flex-col border-r border-border shrink-0 w-72",
          selectedId ? "hidden md:flex" : "flex w-full md:w-72",
        )}
      >
        <div className="px-4 py-3 border-b border-border shrink-0 flex items-center gap-2">
          <h2 className="font-semibold text-sm flex-1">Customer Chats</h2>
          {openCount > 0 && (
            <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-semibold">
              {openCount}
            </span>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <MessageCircle className="size-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">
                No chats yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Customer messages will appear here
              </p>
            </div>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3.5 border-b border-border text-left hover:bg-muted/50 transition-colors duration-300",
                selectedId === conv.id && "bg-muted",
              )}
            >
              <div
                className={cn(
                  "size-2 rounded-full mt-1.5 shrink-0",
                  conv.status === "OPEN"
                    ? "bg-green-500"
                    : "bg-muted-foreground/40",
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold truncate">
                    {conv.order.orderNumber}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {conv.customer?.user?.name ?? "Guest"}
                </p>
                {conv.messages[0] && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {conv.messages[0].content}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation thread */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          <AdminChatConversation
            tenantId={tenantId}
            conversationId={selected.id}
            orderNumber={selected.order.orderNumber}
            status={selected.status}
            onClose={() => setSelectedId(null)}
            onConversationClosed={() => {
              refetch();
            }}
          />
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center">
          <div className="text-center">
            <MessageCircle className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a conversation
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
