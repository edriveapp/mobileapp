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
  surface: '#F5F7FA',
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
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'poppins_500medium',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'poppins_500medium',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'poppins_500medium',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'poppins_500medium',
  },
  default: {
    sans: 'poppins_500medium',
    serif: 'poppins_500medium',
    rounded: 'poppins_400medium',
    mono: 'poppins_500medium',
  },
  web: {
    sans: "poppins_500medium",
    serif: "poppins_500medium",
    rounded: "poppins_500medium",
    mono: "poppins_500medium",
  },
});
