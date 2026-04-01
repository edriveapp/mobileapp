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
          'request',
        );
      }
    });

    socket.on('ride_request_updated', (ride) => {
      const user = useAuthStore.getState().user;
      if (user?.role === 'driver') {
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
      useTripStore.getState().fetchMyTrips();
      useTripStore.getState().updateRideStatus('ACCEPTED', ride);
      set({ latestAcceptedRide: ride });
      presentLocalNotification(
        'Driver accepted your request',
        `${ride?.driver?.firstName || ride?.driver?.name || 'Your driver'} is on the way.`,
        { type: 'ride_accepted', rideId: ride.id },
        'booking',
      );
    });

    socket.on('trip_booked', (ride) => {
      useTripStore.getState().fetchMyTrips();
      set({ latestBookedTrip: ride });
      presentLocalNotification(
        'New trip booking',
        `${getPassengerName(ride)} booked your trip to ${ride?.destination?.address || 'a destination'}`,
        { type: 'trip_booked', rideId: ride.id },
        'booking',
      );
    });

    socket.on('ride_status_update', (ride) => {
      useTripStore.getState().updateRideStatus(ride.status.toUpperCase(), ride);
      // If it's the current ride, refresh trips to be safe
      useTripStore.getState().fetchMyTrips();
      
      if (ride.status === 'completed' || ride.status === 'cancelled') {
        const user = useAuthStore.getState().user;
        if (user?.role === 'driver') {
          useTripStore.getState().fetchAvailableTrips({ role: 'driver' });
        }
      }
    });

    socket.on('driver_location_update', async (data: { lat: number; lon: number; rideId?: string }) => {
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
      // Trigger a local notification so user hears the ding and sees a banner
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
