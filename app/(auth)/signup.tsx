import { useAuthStore } from '@/app/stores/authStore';
import { UserRole } from '@/app/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { Link, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Firebase web config (must match firebaseConfig.ts)
const firebaseConfig = {
    apiKey: "AIzaSyDNJmzGcTCJoBNnLOsocTKNNwoG1gVonGU",
    authDomain: "edrive-765ed.firebaseapp.com",
    projectId: "edrive-765ed",
    storageBucket: "edrive-765ed.firebasestorage.app",
    messagingSenderId: "831560072030",
    appId: "1:831560072030:web:9ebcd9f94bd8fbf8e66dcf"
};

export default function SignupScreen() {
    const router = useRouter();
    const isLoading = useAuthStore((state) => state.isLoading);
    const sendOtp = useAuthStore((state) => state.sendOtp);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [isDriver, setIsDriver] = useState(false);

    // Ref for the invisible reCAPTCHA modal
    const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

    const handleSignup = async () => {
        if (!name || !email || !phoneNumber || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        // Ensure phone number has country code
        let formattedPhone = phoneNumber.trim();
        if (!formattedPhone.startsWith('+')) {
            // Default to Nigeria country code
            formattedPhone = '+234' + formattedPhone.replace(/^0/, '');
        }

        const role: UserRole = isDriver ? 'driver' : 'rider';

        try {
            // Send OTP via Firebase (client-side) using the reCAPTCHA verifier
            await sendOtp(formattedPhone, recaptchaVerifier.current);

            // Navigate to OTP screen with user details
            router.push({
                pathname: '/(auth)/otp',
                params: {
                    name,
                    email,
                    phoneNumber: formattedPhone,
                    password,
                    role
                }
            });
        } catch (error: any) {
            console.error('Signup OTP error:', error);
            const msg = error.message || 'Failed to send verification code';
            Alert.alert('Error', msg);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Invisible reCAPTCHA modal — renders a WebView overlay when needed */}
            <FirebaseRecaptchaVerifierModal
                ref={recaptchaVerifier}
                firebaseConfig={firebaseConfig}
                attemptInvisibleVerification={true}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>Create an account</Text>
                    </View>
                    <TouchableOpacity style={styles.helpButton}>
                        <Feather name="headphones" size={14} color="black" />
                        <Text style={styles.helpText}>Help</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <Text style={styles.title}>Create an {isDriver ? 'driver' : 'edrive'} account</Text>
                    <View style={styles.subtitleRow}>
                        <Text style={styles.subtitle}>I have an edrive account? </Text>
                        <Link href="/(auth)/login" asChild>
                            <TouchableOpacity>
                                <Text style={styles.subtitleLink}>Login</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Full Name</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your full name"
                                placeholderTextColor={COLORS.textSecondary}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Phone Number</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="+234 701 234 5671"
                                placeholderTextColor={COLORS.textSecondary}
                                keyboardType="phone-pad"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email address"
                                placeholderTextColor={COLORS.textSecondary}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor={COLORS.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                            <TouchableOpacity>
                                <IconSymbol name="eye.slash" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter Password Again"
                                placeholderTextColor={COLORS.textSecondary}
                                secureTextEntry
                            />
                            <TouchableOpacity>
                                <IconSymbol name="eye.slash" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>



                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleSignup}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.buttonText}>Sign Up</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Are you a driver? </Text>
                        <TouchableOpacity onPress={() => setIsDriver(!isDriver)}>
                            <Text style={styles.link}>Create account</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffff',
        paddingHorizontal: SPACING.m,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 42,
        paddingBottom: SPACING.m,
    },
    tag: {
        backgroundColor: '#bdf7db',
        paddingHorizontal: 20,
        paddingVertical: 6,
        borderRadius: 13,
    },
    tagText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '500',
        fontFamily: Fonts.rounded,
    },
    helpButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 4,
        paddingHorizontal: 13,
    },
    helpText: {
        fontSize: 12,
        color: COLORS.text,
        fontWeight: '500',
        fontFamily: Fonts.rounded,
    },
    content: {
        flex: 1,
        paddingBottom: 20,
    },
    title: {
        fontSize: 27,
        fontWeight: '400',
        color: COLORS.text,
        fontFamily: Fonts.rounded,
        marginBottom: 8,
        letterSpacing: -1.0,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    subtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        letterSpacing: -0.5,
        fontFamily: Fonts.rounded,
        fontWeight: '400',
        lineHeight: 18,
    },
    subtitleLink: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    inputContainer: {
        marginBottom: SPACING.m,
    },
    label: {
        fontSize: 14,
        fontWeight: '400',
        color: COLORS.text,
        marginBottom: 3,
        fontFamily: Fonts.rounded,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: SPACING.m,
        height: 45,
    },
    input: {
        flex: 1,
        fontSize: 13,
        color: COLORS.text,
        fontFamily: Fonts.rounded,
    },
    roleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.m,
    },
    roleLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    roleLink: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    button: {
        backgroundColor: COLORS.primary,
        height: 42,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 80,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: Fonts.rounded,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 13,
    },
    footerText: {
        color: COLORS.textSecondary,
        fontSize: 13,
    },
    link: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
