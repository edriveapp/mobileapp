import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Animated, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo'; // npx expo install @react-native-community/netinfo
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';

export default function NetworkBanner() {
  const insets = useSafeAreaInsets();
  const [isConnected, setIsConnected] = useState(true);
  const slideAnim = useState(new Animated.Value(-100))[0]; // Start hidden above screen

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = state.isConnected === false;
      setIsConnected(!offline);
      
      Animated.timing(slideAnim, {
        toValue: offline ? 0 : -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    return unsubscribe;
  }, []);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }], paddingTop: insets.top }]}>
      <Text style={styles.text}>No Internet Connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#D32F2F',
    zIndex: 999,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 80,
  },
  text: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});