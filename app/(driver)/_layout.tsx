import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { useAuthStore } from '@/app/stores/authStore';
import { useDriverStore } from '@/app/stores/driverStore';
import { COLORS } from '@/constants/theme';

export default function DriverLayout() {
  const user = useAuthStore((s) => s.user);
  const hasCompletedOnboarding = useDriverStore((s) => s.hasCompletedOnboarding);

  // Check authentication
  if (!user) return <Redirect href="/(auth)/login" />;

  // Check user role
  if (user.role !== 'driver') return <Redirect href="/(tabs)" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarShowLabel: false, // Hides labels to match your main layout
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: '#fff',
            borderTopWidth: 0,
            height: 60,
            paddingBottom: 5,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 10,
          },
          default: {
            backgroundColor: '#fff',
            borderTopWidth: 0,
            height: 60,
            paddingBottom: 5,
            elevation: 8,
          },
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="create-trip"
        options={{
          title: 'New Trip',
          tabBarIcon: ({ color }) => (
            // Using "add-circle-outline" to match the outline style of your other icons
            <Ionicons name="add-circle-outline" size={28} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="onboarding"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}