import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { useAuthStore } from "./authStore";
import { useSocketStore } from "./socketStore";

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
  getUnreadChatCount: () => number;
}

const getChatStorageKey = (rideId: string) => `chat_messages_${rideId}`;
const getUnreadStorageKey = () => "chat_unread_counts";

// Global flags for socket listener and persistence
let messageListenerAttached = false;
const writeQueue = new Map<string, Message[]>();
const seenMessages = new Set<string>();

const schedulePersist = (rideId: string, messages: Message[]) => {
  writeQueue.set(rideId, messages);

  setTimeout(async () => {
    const latest = writeQueue.get(rideId);
    if (latest) {
      await AsyncStorage.setItem(
        getChatStorageKey(rideId),
        JSON.stringify(normalizeMessages(latest)),
      );
      writeQueue.delete(rideId);
    }
  }, 300);
};

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
  schedulePersist(rideId, toSave);
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentRideId: null,
  unreadByRide: {},

  getTotalUnread: () => {
    return Object.values(get().unreadByRide).reduce((sum, count) => {
      const val = typeof count === "number" ? count : 0;
      return sum + Math.max(0, val);
    }, 0);
  },

  getUnreadChatCount: () => {
    // Only count rides that have a count > 0
    return Object.keys(get().unreadByRide).length;
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
    schedulePersist(rideId, normalized);
  },

  setupChat: (rideId: string) => {
    const socket = useSocketStore.getState().socket;
    if (!socket) {
      console.warn("Socket not initialized. Retrying in 1s...");
      setTimeout(() => get().setupChat(rideId), 1000);
      return;
    }

    set({ currentRideId: rideId });
    socket.emit("join_chat", { rideId });
    void get().markRideRead(rideId);

    // Reset listener flag on reconnect to prevent stale handlers
    socket.on("connect", () => {
      messageListenerAttached = false;
    });

    // Use manual flag instead of unreliable listeners()
    if (!messageListenerAttached) {
      socket.on("receive_message", (message: Message & { rideId?: string }) => {
        const msgRideId = message.rideId ?? get().currentRideId;
        if (!msgRideId) return;
        void get().addMessage(msgRideId, message);
      });
      messageListenerAttached = true;
    }
  },

  leaveChat: (rideId: string) => {
    const socket = useSocketStore.getState().socket;
    if (socket) {
      // Tell the server to remove us from the room — messages for this ride
      // will no longer be pushed while we're not in the chat screen.
      socket.emit("leave_chat", { rideId });
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

    // 1. Create optimistic message with unique clientId
    const clientId = `optimistic_${Date.now()}_${Math.random()}`;
    const optimisticMsg: Message = {
      _id: clientId,
      text,
      createdAt: new Date().toISOString(),
      user: { _id: user.id, name: user.name || "Me" },
      pending: true,
    };

    // Add optimistic message to the UI immediately
    const nextMessages = [...get().messages, optimisticMsg];
    set({ messages: nextMessages });

    // 2. Emit over socket with clientId for correlation
    if (socket && socket.connected) {
      socket.emit("send_message", {
        rideId,
        text,
        senderId: user.id,
        role: user.role === "driver" ? "DRIVER" : "PASSENGER",
        clientId, // Add for server echo
      });
    } else {
      console.warn(
        "Socket not connected, message might not send until reconnected",
      );
    }
  },

  addMessage: async (incomingRideId, msg) => {
    const state = get();
    const isActiveChat = state.currentRideId === incomingRideId;

    // Only add to the visible messages list when this chat is open
    if (isActiveChat) {
      const withoutOptimistic = state.messages.filter((m) => {
        if (!m.pending) return true;
        // Match pending messages by text and user to replace with server confirmation
        return !(
          m.pending &&
          m.text === msg.text &&
          m.user._id === msg.user._id
        );
      });

      const alreadyConfirmed = withoutOptimistic.some(
        (m) => !m.pending && m._id === msg._id,
      );
      if (!alreadyConfirmed) {
        const nextMessages = normalizeMessages([
          ...withoutOptimistic,
          { ...msg, pending: false },
        ]);
        set({ messages: nextMessages });
        schedulePersist(incomingRideId, nextMessages);
      }
    } else {
      // Message arrived for a different ride — persist it silently under the correct key
      try {
        const cached = await AsyncStorage.getItem(
          getChatStorageKey(incomingRideId),
        );
        const existing: Message[] = cached ? JSON.parse(cached) : [];
        const alreadyHave = existing.some((m) => m._id === msg._id);
        if (!alreadyHave) {
          const updated = normalizeMessages([
            ...existing,
            { ...msg, pending: false },
          ]);
          schedulePersist(incomingRideId, updated);
        }
      } catch {
        /* non-fatal */
      }
    }

    const user = useAuthStore.getState().user;
    const isOwnMessage = msg.user?._id === user?.id;
    // Prevent double-counting unread with seen message tracking
    if (!isOwnMessage && !isActiveChat && !seenMessages.has(msg._id)) {
      seenMessages.add(msg._id);
      await get().incrementUnread(incomingRideId);
    }
  },

  incrementUnread: async (rideId) => {
    const nextUnread = {
      ...get().unreadByRide,
      [rideId]: (get().unreadByRide[rideId] || 0) + 1,
    };
    set({ unreadByRide: nextUnread });
    await AsyncStorage.setItem(
      getUnreadStorageKey(),
      JSON.stringify(nextUnread),
    );
  },

  markRideRead: async (rideId) => {
    if (!rideId) return;
    const nextUnread = { ...get().unreadByRide };
    if (!(rideId in nextUnread)) return;

    delete nextUnread[rideId];
    set({ unreadByRide: nextUnread });

    try {
      await AsyncStorage.setItem(
        getUnreadStorageKey(),
        JSON.stringify(nextUnread),
      );
    } catch (err) {
      console.error("Failed to persist unread counts", err);
    }
  },
}));
