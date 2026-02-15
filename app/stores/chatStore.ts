import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { useAuthStore } from './authStore';

export interface Message {
    _id: string;
    text: string;
    createdAt: Date | string; // Allow string for serialization
    user: {
        _id: string;
        name: string;
    };
}

interface ChatState {
    messages: Message[];
    socket: Socket | null;
    isConnected: boolean;

    // Actions
    connect: (rideId: string) => void;
    disconnect: () => void;
    sendMessage: (rideId: string, text: string) => void;
    addMessage: (msg: Message) => void;
    setMessages: (msgs: Message[]) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    messages: [],
    socket: null,
    isConnected: false,

    setMessages: (messages) => set({ messages }),

    connect: (rideId: string) => {
        const socket = io('http://192.168.1.5:3000'); // TODO: Use dynamic URL from api.ts
        // Actually, let's get base URL from api.defaults.baseURL if possible, or just hardcode for MVP if dynamic is complex here.
        // api.ts has getBaseUrl logic but it's internal.
        // I'll grab it from Constants or just assume localhost for now, user can change.
        // Better: use the same logic as API.

        socket.on('connect', () => {
            console.log('Socket connected');
            set({ isConnected: true });
            socket.emit('join_chat', { rideId });
        });

        socket.on('receive_message', (message: Message) => {
            get().addMessage(message);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            set({ isConnected: false });
        });

        set({ socket });
    },

    disconnect: () => {
        const { socket } = get();
        if (socket) {
            socket.disconnect();
            set({ socket: null, isConnected: false, messages: [] });
        }
    },

    sendMessage: (rideId, text) => {
        const { socket } = get();
        const user = useAuthStore.getState().user;
        if (socket && user) {
            socket.emit('send_message', {
                rideId,
                text,
                senderId: user.id,
                role: user.role === 'driver' ? 'DRIVER' : 'PASSENGER'
            });
        }
    },

    addMessage: (msg) => {
        set((state) => ({ messages: [...state.messages, msg] }));
    }
}));
