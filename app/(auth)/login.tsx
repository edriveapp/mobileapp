import { AuthService } from '@/app/services/authService';
import { useAuthStore } from '@/app/stores/authStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, Fonts, SPACING } from '@/constants/theme';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, StatusBar, Platform } from 'react-native';

export default function LoginScreen() {
    const router = useRouter();
    const login = useAuthStore((state: { login: any }) => state.login);
    const setLoading = useAuthStore((state: { setLoading: any }) => state.setLoading);
    const isLoading = useAuthStore((state: { isLoading: any }) => state.isLoading);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            const user = await AuthService.login(email, password);
            login(user);
            router.replace('/(tabs)');
        } catch (error) {
            Alert.alert('Error', 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
            
            <View style={styles.header}>
                <View style={styles.tag}>
                    <Text style={styles.tagText}>Welcome Back</Text>
                </View>
                <TouchableOpacity style={styles.helpButton}>
                    <IconSymbol name="headphones" size={16} color={COLORS.text} />
                    <Text style={styles.helpText}>Help</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>Log into your account</Text>
                <Text style={styles.subtitle}>Enter your email and password to access your edrive account</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email Address</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type your email address"
                            placeholderTextColor="#B0B0B0"
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
                            placeholder="Type your password"
                            placeholderTextColor="#B0B0B0"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <IconSymbol 
                                name={showPassword ? "eye" : "eye.slash"} 
                                size={20} 
                                color="#141414ff" 
                            />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.forgotPassword}>
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.buttonText}>Log in</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an edrive account? </Text>
                    <Link href="/(auth)/signup" asChild>
                        <TouchableOpacity>
                            <Text style={styles.link}>Create account</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffffff',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        
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
        paddingHorizontal: 20,
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
        paddingHorizontal: 16,
        paddingVertical: 5,
        backgroundColor: '#E5E7EB',
        borderRadius: 13,
    },
    helpText: {
        fontSize: 13,
        color: COLORS.text,
        fontWeight: '500',
        fontFamily: Fonts.rounded,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '600',
        color: '#000000',
        fontFamily: Fonts.rounded,
        marginBottom: 8,
        letterSpacing: -1.0,
    },
    subtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        letterSpacing: -0.5,
        fontFamily: Fonts.rounded,
        fontWeight: '500',
        marginBottom: 38,
        lineHeight: 22,
    },
    inputContainer: {
        marginBottom: 18,
    },
    label: {
        fontSize: 16,
        fontWeight: '400',
        color: '#000000',
        marginBottom: 3     ,
        fontFamily: Fonts.rounded,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 0.5,
        borderColor: '#b49f9fff',
        borderRadius: 12,
        paddingHorizontal: 10,
        
        height: 45,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        fontFamily: Fonts.rounded,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginTop: 12,
    },
    forgotPasswordText: {
        color: '#000000',
        fontSize: 15,
        fontWeight: '500',
        fontFamily: Fonts.rounded,
    },
    button: {
        backgroundColor: COLORS.primary,
        height: 42,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 260,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '400',
        fontFamily: Fonts.rounded,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
        alignItems: 'center',
    },
    footerText: {
        color: '#9CA3AF',
        fontSize: 13,
        fontFamily: Fonts.rounded,
    },
    link: {
        color: COLORS.primary,
        fontWeight: '500',
        fontSize: 14,
        fontFamily: Fonts.rounded,
        textDecorationLine: 'underline',
    },
});