import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { getSocketBaseUrl } from '../services/api';
import { useAuthStore } from './authStore';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data: any) => void;
  joinRoom: (roomName: string) => void;
  leaveRoom: (roomName: string) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    const existing = get().socket;
    if (existing?.connected) return;

    if (existing) {
        existing.disconnect();
    }

    const { token, user } = useAuthStore.getState();
    if (!token || !user) return;

    const socketUrl = getSocketBaseUrl();
    const socket = io(socketUrl, {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('connect', () => {
      set({ isConnected: true });
      // Always join user-specific rooms on connect
      socket.emit('join_user_room', user.id);
      if (user.role === 'driver') {
        socket.emit('join_driver_room', user.id);
      }
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ socket: null, isConnected: false });
  },

  emit: (event: string, data: any) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn(`Socket not connected. Cannot emit ${event}`);
    }
  },

  joinRoom: (roomName: string) => {
    const { socket } = get();
    if (socket?.connected) {
      // We assume the backend has a generic join_room or specific ones
      // For rides/chats, we use specific ones already defined in gateways
      if (roomName.startsWith('ride_')) {
        socket.emit('join_chat', { rideId: roomName.replace('ride_', '') });
      } else {
        socket.emit('join_room', roomName);
      }
    }
  },

  leaveRoom: (roomName: string) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('leave_room', roomName);
    }
  },
}));
