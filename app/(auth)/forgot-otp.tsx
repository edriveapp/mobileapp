import { COLORS, Fonts } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '@/app/services/api';

export default function ForgotOtpScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = (params.email as string) || '';
    const insets = useSafeAreaInsets();

    const [otp, setOtp] = useState(['', '', '', '']);
    const inputs = useRef<Array<TextInput | null>>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        if (resendTimer > 0) {
            const interval = setInterval(() => {
                setResendTimer((prev) => {
                    if (prev <= 1) { setCanResend(true); clearInterval(interval); return 0; }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [resendTimer]);

    const handleResend = async () => {
        if (!canResend) return;
        try {
            await api.post('/auth/forgot-password', { email });
            setResendTimer(60);
            setCanResend(false);
            Alert.alert('Code resent', 'A new code has been sent to your email.');
        } catch {
            Alert.alert('Error', 'Could not resend code. Please try again.');
        }
    };

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 3) {
            inputs.current[index + 1]?.focus();
        } else if (value && index === 3) {
            Keyboard.dismiss();
        }
    };

    const handleBackspace = (key: string, index: number) => {
        if (key === 'Backspace' && !otp[index] && index > 0) inputs.current[index - 1]?.focus();
    };

    const handleNext = async () => {
        const code = otp.join('');
        if (code.length !== 4) {
            Alert.alert('Required', 'Please enter the 4-digit code.');
            return;
        }
        setIsLoading(true);
        try {
            router.push({ pathname: '/(auth)/create-password', params: { email, otp: code } });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
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
                    <Text style={styles.title}>Confirm OTP</Text>
                    <Text style={styles.subtitle}>
                        We sent a 4-digit code to{'\n'}
                        <Text style={styles.emailHighlight}>{email}</Text>
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

                    <View style={styles.resendRow}>
                        <Text style={styles.resendText}>Didn't receive the code? </Text>
                        {canResend ? (
                            <TouchableOpacity onPress={handleResend}>
                                <Text style={styles.resendLink}>Resend</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* CTA pinned at bottom — outside KeyboardAvoidingView so it never shifts */}
            <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[styles.button, isLoading && { opacity: 0.7 }]}
                    onPress={handleNext}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.buttonText}>Continue</Text>
                    )}
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
    flex: {
        flex: 1,
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
        alignItems: 'center',
        paddingTop: 16,
    },
    title: {
        fontSize: 27,
        fontWeight: '400',
        color: '#000',
        fontFamily: Fonts.rounded,
        marginBottom: 8,
        letterSpacing: -1.0,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#6e6e6e',
        fontFamily: Fonts.rounded,
        marginBottom: 40,
        textAlign: 'center',
        lineHeight: 22,
    },
    emailHighlight: {
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: Fonts.semibold,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 24,
    },
    otpInput: {
        width: 55,
        height: 55,
        marginHorizontal: 8,
        borderWidth: 1,
        borderColor: '#e9e9e9',
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
        backgroundColor: '#e6ece6',
    },
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
        fontFamily: Fonts.semibold,
        textDecorationLine: 'underline',
    },
    resendTimer: {
        fontSize: 14,
        color: COLORS.textSecondary,
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
});
