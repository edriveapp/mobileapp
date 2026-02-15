import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab'; // Ensure casing matches file system
import { COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme'; // Ensure casing matches file system
import { CustomHomeIcon } from '@/components/icon'; // Ensure casing matches file system


export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: true,
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
            // Ionicons car-sport match requested "Car icon"
            <Ionicons name="car-sport" size={26} color={color} />
          ),
        }}
      />

      {/* 3. Chat Tab (Inbox) */}
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubbles" size={24} color={color} />
          ),
        }}
      />

      {/* 4. Profile Tab */}
      <Tabs.Screen
        name="profile"
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