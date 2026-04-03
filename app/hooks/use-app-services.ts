import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useRideRealtimeStore } from '../stores/rideRealtimeStore';
import { useSocketStore } from '../stores/socketStore';
import { addNotificationResponseListener, syncPushToken } from '../services/notifications';

export function useAppServices() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const hydrateUnread = useChatStore((state) => state.hydrateUnread);
  const { connect: connectSocket, disconnect: disconnectSocket, isConnected: isSocketConnected } = useSocketStore();
  const setupRealtimeListeners = useRideRealtimeStore((state) => state.setupListeners);

  const {
    latestAcceptedRide,
    latestBookedTrip,
    latestChatMessage,
    clearLatestAcceptedRide,
    clearLatestBookedTrip,
    clearLatestChatMessage,
  } = useRideRealtimeStore();

  // Socket and core services connection
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      disconnectSocket();
      return;
    }

    // Stabilizing the connection logic to prevent log flooding
    connectSocket();
    syncPushToken();
    void hydrateUnread();
  }, [isAuthenticated, user?.id]); // Only re-run when auth status or user ID changes

  // Realtime listeners
  useEffect(() => {
    if (isSocketConnected) {
      setupRealtimeListeners();
    }
  }, [isSocketConnected, setupRealtimeListeners]);

  // Ride lifecycle handlers
  useEffect(() => {
    if (!latestAcceptedRide || user?.role !== 'passenger') return;
    clearLatestAcceptedRide();
  }, [clearLatestAcceptedRide, latestAcceptedRide, user?.role]);

  useEffect(() => {
    if (!latestBookedTrip || user?.role !== 'driver') return;
    clearLatestBookedTrip();
  }, [clearLatestBookedTrip, latestBookedTrip, user?.role]);

  useEffect(() => {
    if (!latestChatMessage?.rideId) return;
    clearLatestChatMessage();
  }, [clearLatestChatMessage, latestChatMessage]);

  // Notifications
  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      const data = (response.notification.request.content.data || {}) as any;
      const rideId = typeof data.rideId === 'string' ? data.rideId : '';
      const type = typeof data.type === 'string' ? data.type : '';

      if (type === 'chat_message' && rideId) {
        router.push(`/chat/${rideId}`);
        return;
      }

      if ((type === 'ride_accepted' || type === 'trip_booked') && rideId) {
        if (user?.role === 'driver') {
          router.push('/(driver)/maps');
        } else {
          router.replace('/(tabs)');
        }
        return;
      }

      if (type === 'ride_request') {
        router.push('/(driver)/requests');
      }
    });

    return () => subscription.remove();
  }, [router, user?.role]);
}
