import { AuthService } from '@/app/services/authService';
import { useAuthStore } from '@/app/stores/authStore';
import { UserRole } from '@/app/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignupScreen() {
    const router = useRouter();
    const login = useAuthStore((state: { login: any }) => state.login);
    const setLoading = useAuthStore((state: { setLoading: any }) => state.setLoading);
    const isLoading = useAuthStore((state: { isLoading: any }) => state.isLoading);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isDriver, setIsDriver] = useState(false);

    const handleSignup = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const role: UserRole = isDriver ? 'driver' : 'rider';
            const user = await AuthService.signup(name, email, role);
            login(user); // Auto login after signup
            router.replace('/(tabs)');
        } catch (error) {
            Alert.alert('Error', 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>Create an account</Text>
                    </View>
                    <TouchableOpacity style={styles.helpButton}>
                        <IconSymbol name="headphones" size={18} color={COLORS.text} />
                        <Text style={styles.helpText}>Help</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <Text style={styles.title}>Create a {isDriver ? 'driver' : 'edrive'} account</Text>
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

                    <View style={styles.roleContainer}>
                        <Text style={styles.roleLabel}>Are you a driver? </Text>
                        <TouchableOpacity onPress={() => setIsDriver(!isDriver)}>
                            <Text style={styles.roleLink}>Create account</Text>
                        </TouchableOpacity>
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
        backgroundColor: COLORS.background,
        paddingHorizontal: SPACING.m,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.l,
        paddingBottom: SPACING.m,
    },
    tag: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: SPACING.m,
        paddingVertical: 6,
        borderRadius: 12,
    },
    tagText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '600',
        fontFamily: Fonts.rounded,
    },
    helpButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 6,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    helpText: {
        fontSize: 12,
        color: COLORS.text,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingBottom: SPACING.xl,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
        fontFamily: Fonts.rounded,
        marginBottom: SPACING.xs,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontFamily: Fonts.rounded,
    },
    subtitleLink: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    inputContainer: {
        marginBottom: SPACING.m,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.s,
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
        height: 56,
    },
    input: {
        flex: 1,
        fontSize: 16,
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
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.l,
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
        marginTop: SPACING.xl,
    },
    footerText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    link: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
