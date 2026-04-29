import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { useTripStore } from './tripStore';
import { useSocketStore } from './socketStore';
import { useChatStore } from './chatStore';
import { presentLocalNotification } from '../services/notifications';
import { NavigatrService } from '../services/navigatrService';

const getPassengerName = (ride: any) => {
  const passenger = ride?.passenger;
  const firstName = String(passenger?.firstName || '').trim();
  return firstName || passenger?.name || passenger?.email || passenger?.phone || 'Passenger';
};

interface RideRealtimeState {
  isConnected: boolean;
  requestQueue: any[];
  latestRideRequest: any | null;
  latestBookedTrip: any | null;
  latestAcceptedRide: any | null;
  latestChatMessage: { rideId: string; text: string } | null;
  driverEta: string | null;
  setupListeners: () => void;
  dequeueRideRequest: (rideId: string) => void;
  clearLatestRideRequest: () => void;
  clearLatestBookedTrip: () => void;
  clearLatestAcceptedRide: () => void;
  clearLatestChatMessage: () => void;
}

let fetchTripsTimeout: any = null;
let lastEtaUpdate = 0;
const notified = new Set<string>();

const safeFetchMyTrips = () => {
  if (fetchTripsTimeout) clearTimeout(fetchTripsTimeout);
  fetchTripsTimeout = setTimeout(() => {
    useTripStore.getState().fetchMyTrips();
  }, 300);
};

export const useRideRealtimeStore = create<RideRealtimeState>((set, get) => ({
  isConnected: false,
  requestQueue: [],
  latestRideRequest: null,
  latestBookedTrip: null,
  latestAcceptedRide: null,
  latestChatMessage: null,
  driverEta: null,

  setupListeners: () => {
    const socket = useSocketStore.getState().socket;
    if (!socket) return;

    // SERIOUS BUG FIX: Guard against attaching duplicate listeners
    if (socket.listeners('ride_request').length > 0) return;

    socket.on('ride_request', (ride) => {
      const user = useAuthStore.getState().user;
      useTripStore.getState().prependAvailableRide(ride);
      set((state) => ({
        latestRideRequest: ride,
        requestQueue: [ride, ...state.requestQueue.filter((item) => item.id !== ride.id)],
      }));

      if (user?.role === 'driver') {
        const notifId = `ride_request_${ride.id}`;
        if (!notified.has(notifId)) {
          notified.add(notifId);
          presentLocalNotification(
            'New rider request',
            `${getPassengerName(ride)} needs a ride to ${ride?.destination?.address || 'a destination'}`,
            { type: 'ride_request', rideId: ride.id },
            'request',
          );
        }
      }
    });

    socket.on('ride_request_updated', (ride) => {
      const user = useAuthStore.getState().user;
      if (user?.role === 'driver') {
        // Optional: debounce this too if it's called frequently
        useTripStore.getState().fetchAvailableTrips({ role: 'driver' });
      }
      set((state) => ({
        latestRideRequest: state.latestRideRequest?.id === ride.id ? ride : state.latestRideRequest,
        requestQueue: state.requestQueue.some((item) => item.id === ride.id)
          ? state.requestQueue.map((item) => (item.id === ride.id ? ride : item))
          : [ride, ...state.requestQueue],
      }));
    });

    socket.on('driver_accepted', (ride) => {
      safeFetchMyTrips();
      useTripStore.getState().updateRideStatus('ACCEPTED', ride);
      set({ latestAcceptedRide: ride });
      
      const notifId = `driver_accepted_${ride.id}`;
      if (!notified.has(notifId)) {
        notified.add(notifId);
        presentLocalNotification(
          'Driver accepted your request',
          `${ride?.driver?.firstName || ride?.driver?.name || 'Your driver'} is on the way.`,
          { type: 'ride_accepted', rideId: ride.id },
          'booking',
        );
      }
    });

    socket.on('trip_booked', (ride) => {
      safeFetchMyTrips();
      set({ latestBookedTrip: ride });

      const notifId = `trip_booked_${ride.id}`;
      if (!notified.has(notifId)) {
        notified.add(notifId);
        presentLocalNotification(
          'New trip booking',
          `${getPassengerName(ride)} booked your trip to ${ride?.destination?.address || 'a destination'}`,
          { type: 'trip_booked', rideId: ride.id },
          'booking',
        );
      }
    });

    socket.on('ride_status_update', (ride) => {
      // FIX: Assume ride object shape may be invalid
      useTripStore.getState().updateRideStatus(String(ride?.status || '').toUpperCase() as any, ride);
      safeFetchMyTrips();
      
      if (ride?.status === 'completed' || ride?.status === 'cancelled') {
        const user = useAuthStore.getState().user;
        if (user?.role === 'driver') {
          useTripStore.getState().fetchAvailableTrips({ role: 'driver' });
        }
      }
    });

    socket.on('driver_location_update', async (data: { lat: number; lon: number; rideId?: string }) => {
      // FIX: Throttle location updates to prevent memory leaks and UI lag
      const now = Date.now();
      if (now - lastEtaUpdate < 5000) return;
      lastEtaUpdate = now;

      const currentRide = useTripStore.getState().currentRide;
      if (!currentRide) return;

      const dest = currentRide.pickupLocation || currentRide.origin;
      if (!dest?.lat || !dest?.lon) return;

      try {
        const eta = await NavigatrService.recalculateETA(
          { lat: data.lat, lng: data.lon },
          { lat: Number(dest.lat), lng: Number(dest.lon) },
        );
        set({ driverEta: eta.durationText });
      } catch {
        // Keep existing ETA on error
      }
    });

    socket.on('chat_message_alert', (message) => {
      if (message?.rideId) {
        void useChatStore.getState().incrementUnread(message.rideId);
      }
      
      const chatNotifId = `chat_${message?.rideId}_${message?.text}`;
      if (!notified.has(chatNotifId)) {
        notified.add(chatNotifId);
        presentLocalNotification(
          'New message',
          message?.text || 'You have a new message',
          { type: 'chat_message', rideId: message?.rideId || '' },
          'message',
        );
        set({
          latestChatMessage: {
            rideId: message?.rideId || '',
            text: message?.text || 'New message',
          },
        });
      }
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
