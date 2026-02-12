import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FindingDriverViewProps {
    onCancel: () => void;
}

export default function FindingDriverView({ onCancel }: FindingDriverViewProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Pulse Animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
            ])
        ).start();

        // Rotate Radar
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 2000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Finding nearby drivers...</Text>
            <Text style={styles.subtitle}>Please wait while we connect you.</Text>

            <View style={styles.radarContainer}>
                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
                <Animated.View style={[styles.radarLine, { transform: [{ rotate }] }]}>
                    <View style={styles.radarHead} />
                </Animated.View>
                <View style={styles.centerIcon}>
                    <Ionicons name="car" size={40} color={COLORS.white} />
                </View>
            </View>

            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Ionicons name="close-circle-outline" size={24} color={COLORS.textSecondary} />
                <Text style={styles.cancelText}>Cancel Request</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: SPACING.l,
    },
    title: {
        fontSize: 22,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
        fontFamily: Fonts.bold,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 60,
        fontFamily: Fonts.rounded,
    },
    radarContainer: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 80,
    },
    pulseCircle: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(0, 81, 36, 0.1)', // Primary color with low opacity
        borderWidth: 1,
        borderColor: 'rgba(0, 81, 36, 0.3)',
    },
    radarLine: {
        position: 'absolute',
        width: 200,
        height: 200,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    radarHead: {
        width: 4,
        height: 100,
        backgroundColor: 'linear-gradient(180deg, rgba(0,81,36,0) 0%, rgba(0,81,36,1) 100%)', // Native doesn't support linear-gradient like this, simplified below
        // Approximate gradient with solid color for MVP

        opacity: 0.5,
        borderTopLeftRadius: 2,
        borderTopRightRadius: 2,
    },
    centerIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        gap: 8,
    },
    cancelText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        fontWeight: '500',
        fontFamily: Fonts.rounded,
    },
});
