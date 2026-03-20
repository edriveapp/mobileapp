import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { syncPushToken } from './services/notifications';
import AnimatedSplashScreen from './components/AnimatedSplashScreen';
import { useAuthStore } from './stores/authStore';
import { useRideRealtimeStore } from './stores/rideRealtimeStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,  
    Poppins_600SemiBold,
    Poppins_700Bold,
  });


  const colorScheme = useColorScheme();
  const { isAuthenticated, hasFinishedSplash, user } = useAuthStore();
  const connectRealtime = useRideRealtimeStore((state) => state.connect);
  const disconnectRealtime = useRideRealtimeStore((state) => state.disconnect);
  const latestAcceptedRide = useRideRealtimeStore((state) => state.latestAcceptedRide);
  const latestBookedTrip = useRideRealtimeStore((state) => state.latestBookedTrip);
  const latestChatMessage = useRideRealtimeStore((state) => state.latestChatMessage);
  const clearLatestAcceptedRide = useRideRealtimeStore((state) => state.clearLatestAcceptedRide);
  const clearLatestBookedTrip = useRideRealtimeStore((state) => state.clearLatestBookedTrip);
  const clearLatestChatMessage = useRideRealtimeStore((state) => state.clearLatestChatMessage);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !hasFinishedSplash) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      if (user?.role === 'driver') {
        router.replace('/(driver)');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [hasFinishedSplash, isAuthenticated, loaded, router, segments, user?.role]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectRealtime();
      return;
    }

    connectRealtime();
    syncPushToken();
  }, [connectRealtime, disconnectRealtime, isAuthenticated, user]);

  useEffect(() => {
    if (!latestAcceptedRide || user?.role !== 'passenger') return;
    router.push(`/chat/${latestAcceptedRide.id}`);
    clearLatestAcceptedRide();
  }, [clearLatestAcceptedRide, latestAcceptedRide, router, user?.role]);

  useEffect(() => {
    if (!latestBookedTrip || user?.role !== 'driver') return;
    Alert.alert(
      'New booking',
      `${latestBookedTrip?.passenger?.firstName || latestBookedTrip?.passenger?.email || 'A rider'} booked your trip.`,
      [
        {
          text: 'View map',
          onPress: () => router.push('/(driver)/maps'),
        },
        {
          text: 'Later',
          style: 'cancel',
        },
      ],
    );
    clearLatestBookedTrip();
  }, [clearLatestBookedTrip, latestBookedTrip, router, user?.role]);

  useEffect(() => {
    if (!latestChatMessage?.rideId) return;
    const inChatRoute = segments[0] === 'chat';
    if (!inChatRoute) {
      Alert.alert('New chat message', latestChatMessage.text, [
        {
          text: 'Open chat',
          onPress: () => router.push(`/chat/${latestChatMessage.rideId}`),
        },
        {
          text: 'Later',
          style: 'cancel',
        },
      ]);
    }
    clearLatestChatMessage();
  }, [clearLatestChatMessage, latestChatMessage, router, segments]);

  if (!loaded) return null;

  if (!hasFinishedSplash) {
    return <AnimatedSplashScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* This renders the nested screens */}
      <Slot />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
