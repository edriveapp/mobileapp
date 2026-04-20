import { useAuthStore } from '@/app/stores/authStore';
import { COLORS, Fonts } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardSafeView from '../components/KeyboardSafeView';

export default function CreatePasswordScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = (params.email as string) || '';
    const otp = (params.otp as string) || '';
    const insets = useSafeAreaInsets();

    const resetPassword = useAuthStore((state) => state.resetPassword);
    const isLoading = useAuthStore((state) => state.isLoading);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleReset = async () => {
        if (!password || !confirmPassword) {
            Alert.alert('Required', 'Please fill in both password fields.');
            return;
        }
        if (password.length < 8) {
            Alert.alert('Too short', 'Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Mismatch', 'Passwords do not match.');
            return;
        }

        try {
            await resetPassword(email, otp, password);
            Alert.alert(
                'Password reset',
                'Your password has been updated. You can now log in.',
                [{ text: 'Log In', onPress: () => router.replace('/(auth)/login') }]
            );
        } catch (error: any) {
            const msg = error?.message || 'Failed to reset password. Please try again.';
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
                    <Text style={styles.title}>Create a new password</Text>
                    <Text style={styles.subtitle}>Your new password must be at least 8 characters.</Text>

                    <View style={[styles.inputContainer, { marginTop: 24 }]}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter a new password"
                                placeholderTextColor="#B0B0B0"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color="#999" />
                            </TouchableOpacity>
                        </View>
                        {password.length > 0 && password.length < 8 && (
                            <Text style={styles.errorText}>8 characters minimum</Text>
                        )}
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm new password"
                                placeholderTextColor="#B0B0B0"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirm}
                            />
                            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                                <Feather name={showConfirm ? 'eye' : 'eye-off'} size={18} color="#999" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardSafeView>

            {/* CTA pinned at bottom — outside KeyboardSafeView so it never shifts */}
            <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[styles.button, isLoading && { opacity: 0.7 }]}
                    onPress={handleReset}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.buttonText}>Reset Password</Text>
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
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
        fontFamily: Fonts.rounded,
        marginLeft: 4,
    },
});
