/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const COLORS = {
  primary: '#005124', // Deep Green
  primaryLight: '#E8F5E9', // Light Green background for tags
  secondary: '#FFD700', // Gold accent
  background: '#FFFFFF',
  surface: '#E5E7EB',
  text: '#1A1A1A',
  textSecondary: '#666666',
  white: '#FFFFFF',
  error: '#EF4444',
  success: '#22C55E',
  border: '#E5E7EB',
};

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'Poppins_500Medium',
    serif: 'Poppins_500Medium',
    rounded: 'Poppins_400Regular',
    mono: 'Poppins_500Medium',
    bold: 'Poppins_700Bold',
    semibold: 'Poppins_600SemiBold',
  },
  android: {
    sans: 'Poppins_500Medium',
    serif: 'Poppins_500Medium',
    rounded: 'Poppins_400Regular',
    mono: 'Poppins_500Medium',
    bold: 'Poppins_700Bold',
    semibold: 'Poppins_600SemiBold',
  },
  web: {
    sans: 'Poppins_500Medium',
    serif: 'Poppins_500Medium',
    rounded: 'Poppins_400Regular',
    mono: 'Poppins_500Medium',
    bold: 'Poppins_700Bold',  
    semibold: 'Poppins_600SemiBold',
  },
  default: {
    sans: 'Poppins_500Medium',
    serif: 'Poppins_500Medium',
    rounded: 'Poppins_400Regular',
    mono: 'Poppins_500Medium',
    bold: 'Poppins_700Bold',
    semibold: 'Poppins_600SemiBold',
  },
});

