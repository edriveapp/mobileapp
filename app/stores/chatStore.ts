import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { getSocketBaseUrl } from '../services/api';
import { useAuthStore } from './authStore';

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
  socket: Socket | null;
  isConnected: boolean;
  currentRideId: string | null;
  unreadByRide: Record<string, number>;
  connect: (rideId: string) => void;
  disconnect: () => void;
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
  socket: null,
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

  connect: (rideId: string) => {
    const existingSocket = get().socket;

    if (existingSocket && get().currentRideId === rideId && existingSocket.connected) {
      // Already connected to this exact ride, do nothing
      return;
    }

    if (existingSocket) {
      existingSocket.disconnect();
    }

    const token = useAuthStore.getState().token;
    const socket = io(getSocketBaseUrl(), {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
    });

    socket.on('connect', () => {
      set({ isConnected: true, currentRideId: rideId });
      socket.emit('join_chat', { rideId });
      void get().markRideRead(rideId);
    });

    // Remove old listeners to prevent duplication on manual reconnects
    socket.off('receive_message');
    socket.on('receive_message', (message: Message) => {
      // addMessage handles the check against the store and persists
      void get().addMessage(rideId, message);
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
      // We purposefully DO NOT clear messages so they persist on screen during a blip
    });

    set({ socket, currentRideId: rideId });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    // Only clear socket state; keep messages and currentRideId intact
    // so the inbox can still read cached messages after leaving the chat screen
    set({ socket: null, isConnected: false });
  },

  sendMessage: (rideId, text) => {
    const { socket } = get();
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
    
    // Only update the active chat list if the incoming message is for the currently open chat screen
    if (state.currentRideId === incomingRideId) {
      const currentMessages = state.messages;
      
      // Remove any optimistic message from the same user within last 10 seconds that perfectly matches text
      const withoutOptimistic = currentMessages.filter((m) => {
        if (!m.pending) return true;
        const sameUser = m.user._id === msg.user?._id;
        const sameText = m.text === msg.text;
        return !(sameUser && sameText);
      });

      // Avoid duplication if we already have the confirmed server message
      const alreadyHaveConfirmed = withoutOptimistic.some(m => !m.pending && m._id === msg._id);
      
      if (!alreadyHaveConfirmed) {
        const nextMessages = normalizeMessages([...withoutOptimistic, { ...msg, pending: false }]);
        set({ messages: nextMessages });
        await persistMessages(incomingRideId, nextMessages);
      }
    }

    const user = useAuthStore.getState().user;
    const isOwnMessage = msg.user?._id === user?.id;
    const isActiveChat = state.currentRideId === incomingRideId;

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
    const nextUnread = { ...get().unreadByRide };
    if (!(rideId in nextUnread)) return;
    delete nextUnread[rideId];
    set({ unreadByRide: nextUnread });
    await AsyncStorage.setItem(getUnreadStorageKey(), JSON.stringify(nextUnread));
  },
}));
