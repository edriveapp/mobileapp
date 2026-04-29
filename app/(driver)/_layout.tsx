import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import {AccountIcon} from '../components/icons/profile';
import { MessagesIcon } from '../components/icons/messages';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Driverhome } from '../components/icons/driverhome';
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
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  // Sum of all unread messages across all rides
  const unreadCount = useChatStore((state) => state.getUnreadChatCount());

  useEffect(() => {
    if (!user || user.role !== 'driver') return;
    refreshProfile();
    const interval = setInterval(() => {
      refreshProfile();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshProfile, user]);


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
            <Driverhome size={24} color={color} />
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
              <MessagesIcon size={21} color={color} />
            </BadgeIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="onboarding"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
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
        name="earnings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="remittance"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => (
            <AccountIcon size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="personal-info"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="vehicle-docs"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
    </Tabs>
  );
}
