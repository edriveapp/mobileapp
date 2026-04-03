import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import AnimatedSplashScreen from './components/AnimatedSplashScreen';
import { useAuthStore } from './stores/authStore';
import { useAppInitialization } from './hooks/use-app-initialization';
import { useAuthRedirect } from './hooks/use-auth-redirect';
import { useAppServices } from './hooks/use-app-services';

// Prevent native splash screen from auto-hiding until we manually hide it in useAppInitialization
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Already prevented or hidden */
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { hasFinishedSplash } = useAuthStore();
  
  // Custom hooks for app-level logic
  const { loaded } = useAppInitialization();
  useAuthRedirect(loaded);
  useAppServices();

  if (!loaded) return null;

  if (!hasFinishedSplash) {
    return <AnimatedSplashScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
