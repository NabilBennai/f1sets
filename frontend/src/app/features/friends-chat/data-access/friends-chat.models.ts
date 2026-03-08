export interface FriendSummary {
  id: number;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export interface FriendRequestItem {
  requestId: number;
  status: string;
  direction: 'INCOMING' | 'OUTGOING';
  user: FriendSummary;
  createdAt: string;
  respondedAt: string | null;
}

export interface FriendRequestsResponse {
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
}

export interface ChatMessage {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  createdAt: string;
  mine: boolean;
  readAt: string | null;
}

export interface ChatHistoryResponse {
  friendId: number;
  messages: ChatMessage[];
}

export interface ChatSocketEnvelope {
  type: 'message' | 'error' | 'read';
  message: ChatMessage | null;
  error: string | null;
  friendId?: number | null;
  readAt?: string | null;
}
