import { useAuthStore } from '@/app/stores/authStore';
import { useDriverStore } from '@/app/stores/driverStore';
import HomeIcon from '@/assets/icons/home.svg';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS } from '@/constants/theme';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';

export default function DriverLayout() {
  const user = useAuthStore((s) => s.user);
  const hasCompletedOnboarding = useDriverStore((s) => s.hasCompletedOnboarding);

  // Check authentication
  if (!user) return <Redirect href="/(auth)/login" />;

  // Check user role
  if (user.role !== 'driver') return <Redirect href="/(tabs)" />;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: 'rgba(0,0,0,0.5)',
      tabBarStyle: {
        backgroundColor: '#fff',
      }
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <HomeIcon width={size ?? 28} height={size ?? 28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create-trip"
        options={{
          title: 'New Trip',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="plus.circle.fill" color={color} />
          ),
        }}
      />
      {/* Hide onboarding from tabs */}
      <Tabs.Screen
        name="onboarding"
        options={{
          href: null,
          title:'ifh',
          tabBarItemStyle: { display: 'none' },
          tabBarStyle: { display: 'none' }
        }}
      />
    </Tabs>
  );
}
