import { broadcastEvent } from "@/lib/supabase/server";

export interface ChatMessageEvent {
  conversationId: string;
  messageId: string;
  senderType: "CUSTOMER" | "STORE";
  content: string;
  createdAt: string;
}

export const chatEvents = {
  async emitNewMessage(event: ChatMessageEvent) {
    await broadcastEvent(
      `chat:${event.conversationId}`,
      "new_message",
      event as unknown as Record<string, unknown>
    );
  },

  async emitCustomerMessage(tenantId: string, event: ChatMessageEvent) {
    await broadcastEvent(
      `admin-chat:${tenantId}`,
      "new_customer_message",
      event as unknown as Record<string, unknown>
    );
  },
};
