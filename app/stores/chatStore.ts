import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { useSocketStore } from './socketStore';

export interface Message {
  _id: string;
  text: string;
  createdAt: Date | string;
  user: {
    _id: string;
    name: string;
  };
  pending?: boolean; // optimistic flag
}

interface ChatState {
  messages: Message[];
  isConnected: boolean;
  currentRideId: string | null;
  unreadByRide: Record<string, number>;
  setupChat: (rideId: string) => void;
  leaveChat: (rideId: string) => void;
  sendMessage: (rideId: string, text: string) => void;
  addMessage: (rideId: string, msg: Message) => Promise<void>;
  setMessages: (rideId: string, msgs: Message[]) => Promise<void>;
  hydrateMessages: (rideId: string) => Promise<void>;
  hydrateUnread: () => Promise<void>;
  incrementUnread: (rideId: string) => Promise<void>;
  markRideRead: (rideId: string) => Promise<void>;
  getTotalUnread: () => number;
}

const getChatStorageKey = (rideId: string) => `chat_messages_${rideId}`;
const getUnreadStorageKey = () => 'chat_unread_counts';

const normalizeMessages = (messages: Message[]) => {
  const unique = new Map<string, Message>();
  messages.forEach((message) => {
    if (!message?._id) return;
    // Confirmed server messages replace optimistic ones
    unique.set(message._id, { ...message, pending: false });
  });

  return Array.from(unique.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
};

const persistMessages = async (rideId: string, messages: Message[]) => {
  // Don't persist optimistic messages
  const toSave = messages.filter((m) => !m.pending);
  await AsyncStorage.setItem(getChatStorageKey(rideId), JSON.stringify(normalizeMessages(toSave)));
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isConnected: false,
  currentRideId: null,
  unreadByRide: {},

  getTotalUnread: () => {
    return Object.values(get().unreadByRide).reduce((sum, count) => sum + count, 0);
  },

  hydrateUnread: async () => {
    try {
      const cached = await AsyncStorage.getItem(getUnreadStorageKey());
      if (!cached) {
        set({ unreadByRide: {} });
        return;
      }

      const parsed = JSON.parse(cached) as Record<string, number>;
      set({ unreadByRide: parsed || {} });
    } catch {
      set({ unreadByRide: {} });
    }
  },

  hydrateMessages: async (rideId) => {
    try {
      const cached = await AsyncStorage.getItem(getChatStorageKey(rideId));
      if (!cached) {
        set({ messages: [], currentRideId: rideId });
        return;
      }

      const parsed = JSON.parse(cached) as Message[];
      set({ messages: normalizeMessages(parsed), currentRideId: rideId });
    } catch {
      set({ messages: [], currentRideId: rideId });
    }
  },

  setMessages: async (rideId, messages) => {
    const normalized = normalizeMessages(messages);
    set({ messages: normalized, currentRideId: rideId });
    await persistMessages(rideId, normalized);
  },

  setupChat: (rideId: string) => {
    const socket = useSocketStore.getState().socket;
    if (!socket) {
      console.warn("Socket not initialized. Retrying in 1s...");
      setTimeout(() => get().setupChat(rideId), 1000);
      return;
    }

    set({ currentRideId: rideId });
    socket.emit('join_chat', { rideId });
    void get().markRideRead(rideId);

    // Use the message's own rideId — never the stale closure value.
    // A single persistent handler is set once; setupChat just refreshes currentRideId.
    if (!socket.listeners('receive_message').length) {
      socket.on('receive_message', (message: Message & { rideId?: string }) => {
        const msgRideId = message.rideId ?? get().currentRideId;
        if (!msgRideId) return;
        void get().addMessage(msgRideId, message);
      });
    }
  },

  leaveChat: (rideId: string) => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      // Tell the server to remove us from the room — messages for this ride
      // will no longer be pushed while we're not in the chat screen.
      socket.emit('leave_chat', { rideId });
      // Do NOT remove the 'receive_message' listener — it is shared across all
      // rides and routes incoming messages by rideId. Removing it here would
      // cause messages for other open rides to be dropped.
    }
    set({ currentRideId: null });
  },

  sendMessage: (rideId, text) => {
    const socket = useSocketStore.getState().socket;
    const user = useAuthStore.getState().user;
    if (!user) return;

    // 1. Send via REST or Optimistic append
    const optimisticId = `optimistic_${Date.now()}`;
    const optimisticMsg: Message = {
      _id: optimisticId,
      text,
      createdAt: new Date().toISOString(),
      user: { _id: user.id, name: user.name || 'Me' },
      pending: true,
    };
    
    // Add optimistic message to the UI immediately
    const nextMessages = [...get().messages, optimisticMsg];
    set({ messages: nextMessages });

    // 2. Emit over socket
    if (socket && socket.connected) {
      socket.emit('send_message', {
        rideId,
        text,
        senderId: user.id,
        role: user.role === 'driver' ? 'DRIVER' : 'PASSENGER',
      });
    } else {
      console.warn("Socket not connected, message might not send until reconnected");
    }
  },

  addMessage: async (incomingRideId, msg) => {
    const state = get();
    const isActiveChat = state.currentRideId === incomingRideId;

    // Only add to the visible messages list when this chat is open
    if (isActiveChat) {
      const withoutOptimistic = state.messages.filter((m) => {
        if (!m.pending) return true;
        return !(m.user._id === msg.user?._id && m.text === msg.text);
      });

      const alreadyConfirmed = withoutOptimistic.some((m) => !m.pending && m._id === msg._id);
      if (!alreadyConfirmed) {
        const nextMessages = normalizeMessages([...withoutOptimistic, { ...msg, pending: false }]);
        set({ messages: nextMessages });
        await persistMessages(incomingRideId, nextMessages);
      }
    } else {
      // Message arrived for a different ride — persist it silently under the correct key
      try {
        const cached = await AsyncStorage.getItem(getChatStorageKey(incomingRideId));
        const existing: Message[] = cached ? JSON.parse(cached) : [];
        const alreadyHave = existing.some((m) => m._id === msg._id);
        if (!alreadyHave) {
          await persistMessages(incomingRideId, normalizeMessages([...existing, { ...msg, pending: false }]));
        }
      } catch { /* non-fatal */ }
    }

    const user = useAuthStore.getState().user;
    const isOwnMessage = msg.user?._id === user?.id;
    if (!isOwnMessage && !isActiveChat) {
      await get().incrementUnread(incomingRideId);
    }
  },

  incrementUnread: async (rideId) => {
    const nextUnread = {
      ...get().unreadByRide,
      [rideId]: (get().unreadByRide[rideId] || 0) + 1,
    };
    set({ unreadByRide: nextUnread });
    await AsyncStorage.setItem(getUnreadStorageKey(), JSON.stringify(nextUnread));
  },

  markRideRead: async (rideId) => {
    if (!rideId) return;
    const nextUnread = { ...get().unreadByRide };
    if (!(rideId in nextUnread)) return;
    
    delete nextUnread[rideId];
    set({ unreadByRide: nextUnread });
    
    try {
      await AsyncStorage.setItem(getUnreadStorageKey(), JSON.stringify(nextUnread));
    } catch (err) {
      console.error('Failed to persist unread counts', err);
    }
  },
}));
