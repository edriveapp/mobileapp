import { useAuthStore } from '@/app/stores/authStore';
import { UserRole } from '@/app/types';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function OtpScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { name, email, phoneNumber, password, role } = params;

    const verifyOtp = useAuthStore((state) => state.verifyOtp);
    const sendOtp = useAuthStore((state) => state.sendOtp);
    const isLoading = useAuthStore((state) => state.isLoading);

    const [otp, setOtp] = useState(['', '', '', '']);
    const inputs = useRef<Array<TextInput | null>>([]);

    // Resend timer
    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        if (resendTimer > 0) {
            const interval = setInterval(() => {
                setResendTimer((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [resendTimer]);

    // Mask phone number: +234 ****5671
    const getMaskedPhone = () => {
        const phone = (phoneNumber as string) || '';
        if (phone.length < 4) return phone;
        const last4 = phone.slice(-4);
        const prefix = phone.slice(0, Math.min(4, phone.length - 4));
        const masked = '*'.repeat(Math.max(0, phone.length - 4 - prefix.length));
        return `${prefix}${masked}${last4}`;
    };

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 3) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleBackspace = (key: string, index: number) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleResend = async () => {
        if (!canResend || !phoneNumber) return;
        try {
            await sendOtp(phoneNumber as string);
            setResendTimer(60);
            setCanResend(false);
            Alert.alert('OTP Resent', 'A new verification code has been sent to your phone.');
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Failed to resend OTP. Please try again.';
            Alert.alert('Error', msg);
        }
    };

    const handleVerify = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 4) {
            Alert.alert('Error', 'Please enter the 4-digit code');
            return;
        }

        if (!name || !email || !phoneNumber || !password || !role) {
            Alert.alert('Error', 'Missing signup information. Please try signing up again.');
            router.back();
            return;
        }

        try {
            const userRole: UserRole = role as UserRole;
            const userData = {
                firstName: name,
                email,
                phone: phoneNumber,
                passwordHash: password,
                role: userRole,
            };

            // Verify OTP via backend (Twilio) and register
            await verifyOtp(otpString, userData);

            if (userRole === 'driver') {
                router.replace('/(driver)');
            } else {
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Verification failed. Please try again.';
            Alert.alert('Error', msg);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.tag}>
                    <Text style={styles.tagText}>Verify number</Text>
                </View>
                <TouchableOpacity style={styles.helpButton}>
                    <Feather name="headphones" size={14} color="black" />
                    <Text style={styles.helpText}>Help</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>Confirm OTP</Text>
                <Text style={styles.subtitle}>
                    We sent a 4-digit code to{' '}
                    <Text style={styles.phoneHighlight}>{getMaskedPhone()}</Text>
                </Text>

                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                            value={digit}
                            onChangeText={(value) => handleOtpChange(value, index)}
                            onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, index)}
                            keyboardType="numeric"
                            maxLength={1}
                            ref={(ref) => { inputs.current[index] = ref; }}
                        />
                    ))}
                </View>

                {/* Resend */}
                <View style={styles.resendRow}>
                    <Text style={styles.resendText}>Didn't receive the code? </Text>
                    {canResend ? (
                        <TouchableOpacity onPress={handleResend}>
                            <Text style={styles.resendLink}>Resend Code</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleVerify}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.buttonText}>Verify</Text>
                    )}
                </TouchableOpacity>
            </View>
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
        alignItems: 'center',
        marginTop: 60,
    },
    title: {
        fontSize: 32,
        fontWeight: '500',
        color: COLORS.text,
        fontFamily: Fonts.rounded,
        marginBottom: 8,
        letterSpacing: -1.0,
    },
    subtitle: {
        fontSize: 16,
        color: '#6e6e6e',
        fontFamily: Fonts.rounded,
        marginBottom: 40,
        textAlign: 'center',
    },
    phoneHighlight: {
        fontWeight: '600',
        color: COLORS.text,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '90%',
        marginBottom: 24,
        gap: 4,
    },
    otpInput: {
        width: 44,
        height: 55,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        borderRadius: 14,
        fontSize: 22,
        paddingVertical: 0,
        textAlign: 'center',
        textAlignVertical: 'center',
        backgroundColor: '#FAFAFA',
        fontFamily: Fonts.rounded,
        color: COLORS.text,
        fontWeight: '600',
    },
    otpInputFilled: {
        borderColor: COLORS.primary,
        backgroundColor: '#E8F5E9',
    },

    // Resend
    resendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
    },
    resendText: {
        fontSize: 14,
        color: '#6e6e6e',
        fontFamily: Fonts.rounded,
    },
    resendLink: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
        fontFamily: Fonts.rounded,
        textDecorationLine: 'underline',
    },
    resendTimer: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
        fontFamily: Fonts.rounded,
    },

    button: {
        backgroundColor: COLORS.primary,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        position: 'absolute',
        bottom: 30,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: Fonts.rounded,
    },
});
