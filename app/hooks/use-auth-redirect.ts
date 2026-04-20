import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useAuthRedirect(loaded: boolean) {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, hasFinishedSplash, user } = useAuthStore();

  useEffect(() => {
    // Wait for fonts and the custom animated splash to finish
    if (!loaded || !hasFinishedSplash) return;

    const inAuthGroup = segments[0] === '(auth)';
    const appOnlyRoutes = ['profile-details', 'saved-places', 'support', 'payment', 'trip-details', 'chat', 'modal'];
    const inAppGroup =
      segments[0] === '(driver)' ||
      segments[0] === '(tabs)' ||
      segments[0] === '(rider)' ||
      appOnlyRoutes.includes(segments[0]);

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/onboarding' as any);
    } else if (isAuthenticated && (inAuthGroup || !inAppGroup)) {
      if (user?.role === 'driver') {
        router.replace('/(driver)' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    }
  }, [hasFinishedSplash, isAuthenticated, loaded, router, segments, user?.role]);
}
