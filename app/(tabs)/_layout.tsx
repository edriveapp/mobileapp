import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { HapticTab } from '@/components/haptic-tab'; // Ensure casing matches file system
import { COLORS } from '@/constants/theme';
import { CustomHomeIcon } from '@/components/icon'; // Ensure casing matches file system
import { useChatStore } from '@/app/stores/chatStore';

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


export default function TabLayout() {
  const unreadByRide = useChatStore((state) => state.unreadByRide);
  const unreadCount = Object.keys(unreadByRide).length;

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
            <DotIcon showDot={unreadCount > 0}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={color} />
            </DotIcon>
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
