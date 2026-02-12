import { AuthService } from '@/app/services/authService';
import { useAuthStore } from '@/app/stores/authStore';
import { UserRole } from '@/app/types';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
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

    const login = useAuthStore((state: { login: any }) => state.login);
    const setLoading = useAuthStore((state: { setLoading: any }) => state.setLoading);
    const isLoading = useAuthStore((state: { isLoading: any }) => state.isLoading);

    const [otp, setOtp] = useState(['', '', '', '']);
    const inputs = useRef<Array<TextInput | null>>([]);

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

    const handleVerifyParams = () => {
        if (!name || !email || !phoneNumber || !password || !role) {
            Alert.alert('Error', 'Missing signup information. Please try signing up again.');
            router.back();
            return false;
        }
        return true;
    }

    const handleVerify = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 4) {
            Alert.alert('Error', 'Please enter a valid 4-digit OTP');
            return;
        }

        if (!handleVerifyParams()) return;

        // Mock OTP verification - accept any 4 digits for now
        // In a real app, you would verify this against a backend

        setLoading(true);
        try {
            // Proceed with signup after successful OTP verification
            const userRole: UserRole = role as UserRole;
            const user = await AuthService.signup(
                name as string,
                email as string,
                phoneNumber as string,
                userRole
            );

            login(user); // Auto login

            if (userRole === 'driver') {
                router.replace('/(driver)');
            } else {
                router.replace('/(tabs)');
            }

        } catch (error) {
            Alert.alert('Error', 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
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
                <Text style={styles.title}>Confirm OTP</Text>
                <Text style={styles.subtitle}>We sent an OTP to your number</Text>

                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            style={styles.otpInput}
                            value={digit}
                            onChangeText={(value) => handleOtpChange(value, index)}
                            onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, index)}
                            keyboardType="numeric"
                            maxLength={1}
                            ref={(ref) => { inputs.current[index] = ref; }}
                        />
                    ))}
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
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '80%',
        marginBottom: 260,
        gap: 10,
    },
    otpInput: {
        width: 50,
        height: 50,
        borderWidth: 1,
        borderColor: '#ccc', // Lighter border color for squares
        borderRadius: 12,
        fontSize: 24,
        paddingVertical:0,
        textAlign: 'center',
        padding: 10,
        textAlignVertical: 'center',
        backgroundColor: COLORS.white,
        fontFamily: Fonts.rounded,
        color: COLORS.text,
    },
    button: {
        backgroundColor: COLORS.primary,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginBottom: 20,
        position: 'absolute',
        bottom: 0,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: Fonts.rounded,
    },
    footer: {
        flexDirection: 'row',
        marginTop: 10,
    },
    footerText: {
        color: '#6e6e6e',
        fontSize: 14,
        fontFamily: Fonts.rounded,
    },
    link: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 14,
        fontFamily: Fonts.rounded,
    },
});
