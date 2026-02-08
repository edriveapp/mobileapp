import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import HomeIcon from '@/assets/icons/home.svg';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
<Tabs
  screenOptions={{
    tabBarActiveTintColor: COLORS.primary,
    tabBarInactiveTintColor: 'rgba(0,0,0,0.5)', // faded black
    headerShown: false,
    tabBarButton: HapticTab,
    tabBarStyle: Platform.select({
      ios: {
        position: 'absolute',
        backgroundColor: '#fff',
      },
      default: {
        backgroundColor: '#fff',
      },
    }),
  }}
>

  <Tabs.Screen
    name="index"
    options={{
      title: 'Home',
      tabBarIcon: ({ color, size }) => (
        <HomeIcon
          width={size ?? 28}
          height={size ?? 28}
          color={color}
        />
      ),
    }}
  />

<Tabs.Screen
  name="trips"
  options={{
    title: 'My Trips',
    tabBarIcon: ({ color, size }) => (
      <IconSymbol size={28} name="map.fill" color={color} />
    ),
  }}
/>

<Tabs.Screen
  name="profile"
  options={{
    title: 'Profile',
    tabBarIcon: ({ color, size }) => (
      <IconSymbol size={28} name="person.fill" color={color} />
    ),
  }}
/>


  <Tabs.Screen
    name="explore"
    options={{ href: null }}
  />
</Tabs>

  );
}
