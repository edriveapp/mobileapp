import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

export function useAppInitialization() {
  const [loaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore errors if the splash screen was already hidden
      });
    }
  }, [loaded]);

  return { loaded };
}
