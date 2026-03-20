import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { useAuthStore } from '@/app/stores/authStore';
import { useChatStore } from '@/app/stores/chatStore';
import { COLORS } from '@/constants/theme';

const DotIcon = ({ children, showDot }: { children: React.ReactNode; showDot: boolean }) => (
  <>
    {children}
    {showDot && (
      <MaterialCommunityIcons
        name="circle"
        size={10}
        color="#22C55E"
        style={{ position: 'absolute', top: -1, right: -4 }}
      />
    )}
  </>
);

export default function DriverLayout() {
  const user = useAuthStore((s) => s.user);
  const unreadByRide = useChatStore((state) => state.unreadByRide);
  const unreadCount = Object.keys(unreadByRide).length;

  // Check authentication
  if (!user) return <Redirect href="/(auth)/login" />;

  // Check user role
  if (user.role !== 'driver') return <Redirect href="/(tabs)" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#7B8794',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: '#F8FBFA',
            borderTopWidth: 0,
            height: 68,
            paddingBottom: 8,
            paddingTop: 8,
            shadowColor: '#0B1220',
            shadowOpacity: 0.08,
            shadowRadius: 14,
          },
          default: {
            backgroundColor: '#F8FBFA',
            borderTopWidth: 0,
            height: 68,
            paddingBottom: 8,
            paddingTop: 8,
            elevation: 8,
          },
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="create-trip"
        options={{
          title: 'New Trip',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="plus-circle-outline" size={26} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="maps"
        options={{
          title: 'Dispatch',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="radar" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => (
            <DotIcon showDot={unreadCount > 0}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={color} />
            </DotIcon>
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
        name="requests"
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
          title: 'Account',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-circle-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
