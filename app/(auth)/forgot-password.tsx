import { useAuthStore } from '@/app/stores/authStore';
import { COLORS, Fonts } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardSafeView from '../components/KeyboardSafeView';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const forgotPassword = useAuthStore((state) => state.forgotPassword);
    const isLoading = useAuthStore((state) => state.isLoading);
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');

    const handleNext = async () => {
        if (!email.trim()) {
            Alert.alert('Required', 'Please enter your email address.');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            Alert.alert('Invalid email', 'Please enter a valid email address.');
            return;
        }

        try {
            await forgotPassword(email.trim().toLowerCase());
            router.push({ pathname: '/(auth)/forgot-otp', params: { email: email.trim().toLowerCase() } });
        } catch (error: any) {
            const msg = error?.message || 'Failed to send reset code. Please try again.';
            Alert.alert('Error', msg);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

            <KeyboardSafeView>
                <View style={styles.header}>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>Change Password</Text>
                    </View>
                    <TouchableOpacity style={styles.helpButton}>
                        <Feather name="headphones" size={14} color="black" />
                        <Text style={styles.helpText}>Help</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <Text style={styles.title}>Forgot Password</Text>
                    <Text style={styles.subtitle}>Enter your account email and we'll send you a reset code.</Text>

                    <View style={[styles.inputContainer, { marginTop: 24 }]}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email address"
                                placeholderTextColor="#B0B0B0"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoComplete="email"
                            />
                        </View>
                    </View>
                </View>
            </KeyboardSafeView>

            {/* CTA pinned at bottom — outside KeyboardSafeView so it never shifts */}
            <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[styles.button, isLoading && { opacity: 0.7 }]}
                    onPress={handleNext}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.buttonText}>Send Reset Code</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
                    <Text style={styles.backLinkText}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    tag: {
        backgroundColor: '#BDF7DB',
        paddingHorizontal: 17,
        paddingVertical: 6,
        borderRadius: 13,
    },
    tagText: {
        color: '#1B5E20',
        fontSize: 12,
        fontWeight: '500',
        fontFamily: Fonts.rounded,
    },
    helpButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 13,
        paddingVertical: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
    },
    helpText: {
        fontSize: 12,
        color: COLORS.text,
        fontWeight: '500',
        fontFamily: Fonts.rounded,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    title: {
        fontSize: 27,
        fontWeight: '400',
        color: '#000',
        fontFamily: Fonts.rounded,
        marginBottom: 8,
        letterSpacing: -1.0,
    },
    subtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        fontFamily: Fonts.rounded,
        lineHeight: 22,
        marginBottom: 4,
    },
    inputContainer: { marginBottom: 18 },
    label: {
        fontSize: 16,
        fontWeight: '400',
        color: '#000',
        marginBottom: 3,
        fontFamily: Fonts.rounded,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 0.5,
        borderColor: '#b49f9f',
        borderRadius: 12,
        paddingHorizontal: 10,
        height: 48,
    },
    input: {
        flex: 1,
        fontSize: 13,
        color: COLORS.text,
        fontFamily: Fonts.rounded,
    },
    bottomSection: {
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    button: {
        backgroundColor: COLORS.primary,
        height: 48,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '600',
        fontFamily: Fonts.semibold,
    },
    backLink: {
        alignItems: 'center',
        marginTop: 16,
        paddingVertical: 8,
    },
    backLinkText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
    },
});
