import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import api from '../services/api';
import { User } from '../types';

const normalizeUser = (rawUser: any): User => ({
    id: String(rawUser?.id || ''),
    name:
        rawUser?.name ||
        [rawUser?.firstName, rawUser?.lastName].filter(Boolean).join(' ').trim() ||
        rawUser?.email ||
        'User',
    email: String(rawUser?.email || ''),
    role: rawUser?.role === 'driver' ? 'driver' : 'passenger',
    phoneNumber: String(rawUser?.phoneNumber || rawUser?.phone || ''),
    isVerified: Boolean(rawUser?.isVerified ?? rawUser?.role === 'driver'),
    avatarUrl: rawUser?.avatarUrl,
    isPhoneVerified: Boolean(rawUser?.isPhoneVerified ?? false),
    isEmailVerified: Boolean(rawUser?.isEmailVerified ?? false),
    verificationStatus: rawUser?.verificationStatus,
    token: rawUser?.token,
});

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    hasFinishedSplash: boolean;

    // Actions
    login: (credentials: { email: string; password: string }) => Promise<void>;
    sendOtp: (email: string) => Promise<void>;
    verifyOtp: (code: string, userData: any) => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
    logout: () => Promise<void>;
    checkLogin: () => Promise<void>;
    setFinishedSplash: (finished: boolean) => void;
    refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    hasFinishedSplash: false,

    login: async ({ email, password }) => {
        set({ isLoading: true });
        try {
            const response = await api.post('/auth/login', { email, password });
            const { access_token, user: rawUser } = response.data;
            const user = normalizeUser(rawUser);

            await SecureStore.setItemAsync('token', access_token);
            await SecureStore.setItemAsync('user', JSON.stringify(user));

            set({ user, token: access_token, isAuthenticated: true });
        } catch (error: any) {
            console.error("Login Error:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    sendOtp: async (email) => {
        set({ isLoading: true });
        try {
            await api.post('/auth/send-otp', { email });
        } catch (error: any) {
            console.error("Send OTP Error:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    forgotPassword: async (email) => {
        set({ isLoading: true });
        try {
            await api.post('/auth/forgot-password', { email });
        } catch (error: any) {
            console.error("Forgot Password Error:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    resetPassword: async (email, otp, newPassword) => {
        set({ isLoading: true });
        try {
            await api.post('/auth/reset-password', { email, otp, newPassword });
        } catch (error: any) {
            console.error("Reset Password Error:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    verifyOtp: async (code, userData) => {
        set({ isLoading: true });
        try {
            // Register with our backend (OTP verification happens server-side)
            const response = await api.post('/auth/register', {
                ...userData,
                otpCode: code,
            });
            const { access_token, user: rawUser } = response.data;
            const user = normalizeUser(rawUser);

            await SecureStore.setItemAsync('token', access_token);
            await SecureStore.setItemAsync('user', JSON.stringify(user));

            set({ user, token: access_token, isAuthenticated: true });
        } catch (error: any) {
            console.error("Verify OTP Error:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    logout: async () => {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
        set({ user: null, token: null, isAuthenticated: false });
    },

    checkLogin: async () => {
        set({ isLoading: true });
        try {
            const token = await SecureStore.getItemAsync('token');
            const userStr = await SecureStore.getItemAsync('user');

            if (token && userStr) {
                set({ user: normalizeUser(JSON.parse(userStr)), token, isAuthenticated: true });
            }
        } catch {
            await get().logout();
        } finally {
            set({ isLoading: false, hasFinishedSplash: true });
        }
    },

    refreshProfile: async () => {
        const token = get().token;
        if (!token) return;
        try {
            const response = await api.get('/users/me');
            const user = normalizeUser(response.data);
            const existingToken = get().token;
            await SecureStore.setItemAsync('user', JSON.stringify(user));
            set({ user, token: existingToken, isAuthenticated: true });
        } catch (error: any) {
            const status = error?.response?.status;

            // Invalid/expired token should close session cleanly.
            if (status === 401) {
                await get().logout();
                return;
            }

            // Avoid noisy red-box style logs from periodic profile refresh.
            if (__DEV__) {
                const message = error?.message || 'Unknown refresh profile error';
                console.warn(`Refresh profile skipped: ${message}`);
            }
        }
    },

    setFinishedSplash: (finished) => set({ hasFinishedSplash: finished }),
}));
