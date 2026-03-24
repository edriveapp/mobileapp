import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';

import { useAuthStore } from '@/app/stores/authStore';
import { useChatStore } from '@/app/stores/chatStore';
import { COLORS } from '@/constants/theme';

const BadgeIcon = ({ children, count }: { children: React.ReactNode; count: number }) => (
  <View style={{ position: 'relative' }}>
    {children}
    {count > 0 && (
      <View style={badgeStyles.badge}>
        <Text style={badgeStyles.badgeText}>{count > 99 ? '99+' : count}</Text>
      </View>
    )}
  </View>
);

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#F8FBFA',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});

export default function DriverLayout() {
  const user = useAuthStore((s) => s.user);
  // Sum of all unread messages across all rides
  const unreadCount = useChatStore((state) =>
    Object.values(state.unreadByRide).reduce((sum, n) => sum + n, 0)
  );

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
          href: null,
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
            <BadgeIcon count={unreadCount}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={color} />
            </BadgeIcon>
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
