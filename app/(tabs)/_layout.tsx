import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { HapticTab } from '@/components/haptic-tab'; // Ensure casing matches file system
import { COLORS } from '@/constants/theme';
import { CustomHomeIcon } from '@/components/icon'; // Ensure casing matches file system
import { useChatStore } from '@/app/stores/chatStore';

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

export default function TabLayout() {
  // Sum of all unread messages across all rides (not just ride count)
  const unreadCount = useChatStore((state) =>
    Object.values(state.unreadByRide).reduce((sum, n) => sum + n, 0)
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#7B8794',
        headerShown: false,
        tabBarButton: HapticTab,
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
      {/* 1. Home Tab */}
     <Tabs.Screen
  name="index"
  options={{
    title: 'Home',
    tabBarIcon: ({ color, focused }) => (
      <CustomHomeIcon 
        focused={focused} 
        color={color} 
        size={28} 
      />
    ),
  }}
/>

      {/* 2. Activities Tab (Trips) */}
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="map-marker-path" size={24} color={color} />
          ),
        }}
      />

      {/* 3. Chat Tab (Inbox) */}
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

      {/* 4. Profile Tab */}
      <Tabs.Screen
        name="profile"
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
