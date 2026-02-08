import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Poppins_400Regular, Poppins_500Medium, useFonts } from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import AnimatedSplashScreen from './components/AnimatedSplashScreen';
import { useAuthStore } from './stores/authStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
const [loaded] = useFonts({
  Poppins_400Regular,
  Poppins_500Medium,
});


  const colorScheme = useColorScheme();
  const { isAuthenticated, hasFinishedSplash } = useAuthStore();
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
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, loaded, hasFinishedSplash]);

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
