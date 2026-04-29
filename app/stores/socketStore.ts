import { io, Socket } from "socket.io-client";
import { create } from "zustand";
import { getSocketBaseUrl } from "../services/api";
import { useAuthStore } from "./authStore";
import { useTripStore } from "./tripStore";

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  joinRoom: (roomName: string) => void;
  leaveRoom: (roomName: string) => void;
}

const queue: { event: string; data: any }[] = [];

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    const existing = get().socket;
    const { token, user } = useAuthStore.getState();

    if (!token || !user) return;

    if (existing?.connected && (existing.auth as any)?.token === token) {
      return;
    }

    if (existing) {
      existing.removeAllListeners();
      existing.disconnect();
    }

    const socketUrl = getSocketBaseUrl();
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      set({ isConnected: true });

      socket.emit("join_user_room");
      if (user.role === "driver") {
        socket.emit("join_driver_room");
      }

      queue.forEach(({ event, data }) => {
        socket.emit(event, data);
      });
      queue.length = 0;
    });

    socket.io.on("reconnect", () => {
      console.log("Reconnected 🔁");
      socket.emit("join_user_room");
      if (user.role === "driver") {
        socket.emit("join_driver_room");
      }
    });

    socket.on("connect_error", (err) => {
      console.log("Socket connect error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      set({ isConnected: false });
    });

    // Bridge socket events to tripStore
    socket.on("ride_status_update", (ride) => {
      useTripStore
        .getState()
        .updateRideStatus(ride.status?.toUpperCase(), ride);
    });

    socket.on("driver_accepted", (ride) => {
      useTripStore.getState().updateRideStatus("ACCEPTED", ride);
    });

    socket.on("driver_location_update", (data) => {
      // optional: update map driver position
    });

    socket.on("ride_request", (ride) => {
      useTripStore.getState().prependAvailableRide(ride);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    set({ socket: null, isConnected: false });
  },

  emit: (event: string, data?: any) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      // Do not queue high-frequency transient events like location updates
      if (event !== "driver_location_update") {
        queue.push({ event, data });
      }
    }
  },

  joinRoom: (roomName: string) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      if (roomName.startsWith("ride_")) {
        socket.emit("join_chat", { rideId: roomName.replace("ride_", "") });
      } else {
        socket.emit("join_room", roomName);
      }
    }
  },

  leaveRoom: (roomName: string) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit("leave_room", roomName);
    }
  },
}));
