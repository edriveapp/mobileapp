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
}

const getChatStorageKey = (rideId: string) => `chat_messages_${rideId}`;
const getUnreadStorageKey = () => 'chat_unread_counts';

const normalizeMessages = (messages: Message[]) => {
  const unique = new Map<string, Message>();
  messages.forEach((message) => {
    if (!message?._id) return;
    unique.set(message._id, message);
  });

  return Array.from(unique.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
};

const persistMessages = async (rideId: string, messages: Message[]) => {
  await AsyncStorage.setItem(getChatStorageKey(rideId), JSON.stringify(normalizeMessages(messages)));
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  socket: null,
  isConnected: false,
  currentRideId: null,
  unreadByRide: {},

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
    if (existingSocket && get().currentRideId === rideId) {
      if (!existingSocket.connected) existingSocket.connect();
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

    socket.on('receive_message', (message: Message) => {
      void get().addMessage(rideId, message);
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    set({ socket, currentRideId: rideId });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ socket: null, isConnected: false, currentRideId: null, messages: [] });
  },

  sendMessage: (rideId, text) => {
    const { socket } = get();
    const user = useAuthStore.getState().user;
    if (socket && user) {
      socket.emit('send_message', {
        rideId,
        text,
        senderId: user.id,
        role: user.role === 'driver' ? 'DRIVER' : 'PASSENGER',
      });
    }
  },

  addMessage: async (rideId, msg) => {
    const nextMessages = normalizeMessages([...get().messages, msg]);
    set({ messages: nextMessages, currentRideId: rideId });
    await persistMessages(rideId, nextMessages);

    const user = useAuthStore.getState().user;
    const isOwnMessage = msg.user?._id === user?.id;
    const isActiveChat = get().currentRideId === rideId;

    if (!isOwnMessage && !isActiveChat) {
      await get().incrementUnread(rideId);
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
