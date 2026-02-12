import { COLORS, Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
// import { useNetInfo } from '@react-native-community/netinfo'; // Would be used in real app

interface NetworkErrorBannerProps {
    isConnected: boolean;
}

export default function NetworkErrorBanner({ isConnected }: NetworkErrorBannerProps) {
    const translateY = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        if (!isConnected) {
            // Slide down
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            // Slide up
            Animated.timing(translateY, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isConnected]);

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
            <View style={styles.content}>
                <Ionicons name="cloud-offline" size={20} color={COLORS.white} />
                <Text style={styles.text}>No Internet Connection</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: COLORS.error,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12, // Sufficient for status bar area on some devices, might need SafeAreaView or height adjustment
        paddingTop: 50, // Push down below dynamic island / notch area
        paddingBottom: 12,
        gap: 8,
    },
    text: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '500',
        fontFamily: Fonts.mono,
    },
});
