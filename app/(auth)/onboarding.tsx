import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import abj from '@/assets/images/abj.jpg'
import lag from '@/assets/images/lag.jpg'

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Unlimited Acccess to all Nigerian Cities',
        description: 'Keeping Nigeria fully connected with city\nto city rides for all Nigerians',
        image: lag,
    },
    {
        id: '2',
        title: 'Scan Through Multiple Vehicles and Riders Going Your Way',
        description: 'Share rides with drivers and passengers going your way',
        image: abj,
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        setCurrentIndex(Math.round(index));
    };

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        
        if (currentIndex < SLIDES.length - 1) {
            // Slide forward after 3 seconds
            timer = setTimeout(() => {
                const nextIndex = currentIndex + 1;
                flatListRef.current?.scrollToOffset({ 
                    offset: nextIndex * (width - SPACING.l * 2), 
                    animated: true 
                });
            }, 3000);
        } else {
            // At the end, wait 4 seconds then slide back to the beginning
            timer = setTimeout(() => {
                flatListRef.current?.scrollToOffset({ 
                    offset: 0, 
                    animated: true 
                });
            }, 4000);
        }

        return () => clearTimeout(timer);
    }, [currentIndex]);

    const handleGetStarted = () => {
        router.push('/(auth)/signup');
    };

    const handleLogin = () => {
        router.push('/(auth)/login');
    };

    const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
        return (
            <View style={styles.slide}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Background Image */}
            <Image
                source={SLIDES[currentIndex].image}
                style={styles.backgroundImage}
                resizeMode="cover"
            />

            {/* Cloud Blend Gradient */}
            <LinearGradient
                colors={['transparent', 'rgba(255, 255, 255, 0.8)', '#ffffff', '#ffffff']}
                locations={[0, 0.4, 0.7, 1]}
                style={styles.gradient}
            />

            {/* Bottom Content Area */}
            <View style={styles.bottomContent}>
                {/* Dots */}
                <View style={styles.dotsContainer}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                currentIndex === index && styles.activeDot,
                            ]}
                        />
                    ))}
                </View>

                {/* Swiper for Text */}
                <View style={styles.swiperContainer}>
                    <FlatList
                        data={SLIDES}
                        ref={flatListRef}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                    />
                </View>

                {/* Buttons */}
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.getStartedButton]}
                        onPress={handleGetStarted}
                    >
                        <Text style={[styles.buttonText, { color: COLORS.white }]}>
                            Get started
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.loginButton]}
                        onPress={handleLogin}
                    >
                        <Text style={[styles.buttonText, { color: COLORS.white }]}>
                            Log in
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#e6eced', // Slight gray so the gradient overlap is visible
    },
    backgroundImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: height * 0.6,
    },
    bottomContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        // Removed solid background to let gradient show through perfectly
        backgroundColor: 'transparent',
        paddingHorizontal: SPACING.l,
        paddingBottom: 45,
        paddingTop: 0,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    dot: {
        width: 10,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
        marginHorizontal: 3,
    },
    activeDot: {
        width: 22,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#095C2B',
    },
    swiperContainer: {
        height: 110, // Enough height for max 3 lines of title and description
    },
    slide: {
        width: width - SPACING.l * 2, // Accounting for paddingHorizontal
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#000000',
        fontFamily: Fonts.rounded,
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.6,
        lineHeight: 28,
    },
    description: {
        fontSize: 14,
        color: '#555555',
        fontFamily: Fonts.rounded,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 8,
    },
    buttonsContainer: {
        marginTop: 10,
        gap: 12,
    },
    button: {
        width: '100%',
        height: 50,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    getStartedButton: {
        backgroundColor: '#095C2B', // Dark Green
    },
    loginButton: {
        backgroundColor: '#35C765', // Light Green / Success-like color
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Fonts.rounded,
    },
});
