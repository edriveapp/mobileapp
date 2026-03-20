import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { getSocketBaseUrl } from '../services/api';
import { presentLocalNotification } from '../services/notifications';
import { useAuthStore } from './authStore';
import { useTripStore } from './tripStore';

const getPassengerName = (ride: any) => {
  const passenger = ride?.passenger;
  const fullName = [passenger?.firstName, passenger?.lastName].filter(Boolean).join(' ').trim();
  return fullName || passenger?.name || passenger?.email || passenger?.phone || 'Passenger';
};

interface RideRealtimeState {
  socket: Socket | null;
  isConnected: boolean;
  requestQueue: any[];
  latestRideRequest: any | null;
  latestBookedTrip: any | null;
  latestAcceptedRide: any | null;
  latestChatMessage: { rideId: string; text: string } | null;
  connect: () => void;
  disconnect: () => void;
  dequeueRideRequest: (rideId: string) => void;
  clearLatestRideRequest: () => void;
  clearLatestBookedTrip: () => void;
  clearLatestAcceptedRide: () => void;
  clearLatestChatMessage: () => void;
}

export const useRideRealtimeStore = create<RideRealtimeState>((set, get) => ({
  socket: null,
  isConnected: false,
  requestQueue: [],
  latestRideRequest: null,
  latestBookedTrip: null,
  latestAcceptedRide: null,
  latestChatMessage: null,

  connect: () => {
    const existing = get().socket;
    if (existing) return;

    const auth = useAuthStore.getState();
    if (!auth.token || !auth.user) return;

    const rawSocketUrl = getSocketBaseUrl();
    const socketUrl =
      typeof rawSocketUrl === 'string' && rawSocketUrl.trim().length > 0
        ? rawSocketUrl.trim()
        : 'http://10.0.2.2:3000';

    const socket = io(socketUrl, {
      transports: ['websocket'],
      auth: {
        token: auth.token,
      },
    });

    socket.on('connect', () => {
      const user = useAuthStore.getState().user;
      set({ isConnected: true });
      if (!user) return;

      socket.emit('join_user_room', user.id);
      if (user.role === 'driver') {
        socket.emit('join_driver_room', user.id);
      }
    });

    socket.on('ride_request', (ride) => {
      const user = useAuthStore.getState().user;
      useTripStore.getState().prependAvailableRide(ride);
      set((state) => ({
        latestRideRequest: ride,
        requestQueue: [ride, ...state.requestQueue.filter((item) => item.id !== ride.id)],
      }));

      if (user?.role === 'driver') {
        presentLocalNotification(
          'New rider request',
          `${getPassengerName(ride)} needs a ride to ${ride?.destination?.address || 'a destination'}`,
          { type: 'ride_request', rideId: ride.id },
        );
      }
    });

    socket.on('driver_accepted', (ride) => {
      useTripStore.getState().updateRideStatus('ACCEPTED', ride);
      set({ latestAcceptedRide: ride });
    });

    socket.on('trip_booked', (ride) => {
      useTripStore.getState().fetchMyTrips();
      set({ latestBookedTrip: ride });
      presentLocalNotification(
        'Trip booked',
        `${getPassengerName(ride)} booked your trip to ${ride?.destination?.address || 'a destination'}`,
        { type: 'trip_booked', rideId: ride.id },
      );
    });

    socket.on('receive_message', (message) => {
      set({
        latestChatMessage: {
          rideId: message?.rideId || '',
          text: message?.text || 'New message',
        },
      });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    set({ socket });
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
    }
    set({
      socket: null,
      isConnected: false,
      requestQueue: [],
      latestRideRequest: null,
      latestBookedTrip: null,
      latestAcceptedRide: null,
      latestChatMessage: null,
    });
  },

  dequeueRideRequest: (rideId) =>
    set((state) => ({
      requestQueue: state.requestQueue.filter((ride) => ride.id !== rideId),
      latestRideRequest:
        state.latestRideRequest?.id === rideId
          ? state.requestQueue.find((ride) => ride.id !== rideId) || null
          : state.latestRideRequest,
    })),
  clearLatestRideRequest: () => set({ latestRideRequest: null }),
  clearLatestBookedTrip: () => set({ latestBookedTrip: null }),
  clearLatestAcceptedRide: () => set({ latestAcceptedRide: null }),
  clearLatestChatMessage: () => set({ latestChatMessage: null }),
}));
