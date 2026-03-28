export interface ChatMessage {
  id: string;
  senderType: "CUSTOMER" | "STORE";
  content: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  status: "OPEN" | "CLOSED";
  messages: ChatMessage[];
}
