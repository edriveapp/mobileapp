import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import api from '../services/api';
import { User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    hasFinishedSplash: boolean;

    // Actions
    login: (credentials: { email: string; password: string }) => Promise<void>;
    sendOtp: (phoneNumber: string) => Promise<void>;
    verifyOtp: (code: string, userData: any) => Promise<void>;
    logout: () => Promise<void>;
    checkLogin: () => Promise<void>;
    setFinishedSplash: (finished: boolean) => void;
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
            const { access_token, user } = response.data;

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

    sendOtp: async (phoneNumber) => {
        set({ isLoading: true });
        try {
            await api.post('/auth/send-otp', { phoneNumber });
        } catch (error: any) {
            console.error("Send OTP Error:", error);
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
            const { access_token, user } = response.data;

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
                set({ user: JSON.parse(userStr), token, isAuthenticated: true });
            }
        } catch (error) {
            await get().logout();
        } finally {
            set({ isLoading: false, hasFinishedSplash: true });
        }
    },

    setFinishedSplash: (finished) => set({ hasFinishedSplash: finished }),
}));
