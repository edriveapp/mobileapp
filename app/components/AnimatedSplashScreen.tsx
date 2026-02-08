import { useAuthStore } from '@/app/stores/authStore';
import { COLORS } from '@/constants/theme';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Dynamic import with error handling
let Logo: React.FC<{ width?: number; height?: number }> | null = null;

try {
    Logo = require('@/assets/images/splash.svg').default;
} catch (error) {
    console.log('SVG loading error:', error);
}

export default function AnimatedSplashScreen() {
    const setFinishedSplash = useAuthStore((state) => state.setFinishedSplash);

    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);

    useEffect(() => {
        opacity.value = withTiming(1, { 
            duration: 1500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1)
        });
        
        scale.value = withTiming(1, { 
            duration: 1500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1)
        });

        const timeout = setTimeout(() => {
            setFinishedSplash(true);
        }, 3000);

        return () => clearTimeout(timeout);
    }, []);

    const animatedLogoStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Animated.View style={animatedLogoStyle}>
                    {Logo ? (
                        <Logo width={200} height={80} />
                    ) : (
                        <View style={styles.fallback} />
                    )}
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fallback: {
        width: 200,
        height: 80,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
    },
});