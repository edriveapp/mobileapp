import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary, // Uses your green theme color for the active tab
        tabBarInactiveTintColor: 'gray',       // Gray for inactive tabs
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false, // Hides text labels to match your icon-only snippet
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: '#fff',
            borderTopWidth: 0, // Removes line for a cleaner look
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
            elevation: 8, // Adds shadow on Android
          },
        }),
      }}
    >
      {/* 1. Home Tab - Ionicons "home" */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />

      {/* 2. Trips Tab - MaterialCommunityIcons "clock-time-three-outline" */}
      <Tabs.Screen
        name="trips"
        options={{
          title: 'My Trips',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="clock-time-three-outline" size={26} color={color} />
          ),
        }}
      />

      {/* 3. Profile Tab - Ionicons "person-outline" */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={24} color={color} />
          ),
        }}
      />

      {/* Hide Explore or any other unused tabs */}
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
    </Tabs>
  );
}