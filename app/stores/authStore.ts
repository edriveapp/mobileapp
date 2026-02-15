import * as SecureStore from 'expo-secure-store';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { create } from 'zustand';
import api from '../services/api';
import firebaseAuth from '../services/firebaseConfig';
import { User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    hasFinishedSplash: boolean;

    // Firebase OTP state
    verificationId: string | null;

    // Actions
    login: (credentials: { email: string; password: string }) => Promise<void>;
    register: (payload: { userData: any; firebaseIdToken: string }) => Promise<void>;
    sendOtp: (phoneNumber: string, recaptchaVerifier: any) => Promise<void>;
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
    verificationId: null,

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

    register: async (payload: { userData: any; firebaseIdToken: string }) => {
        set({ isLoading: true });
        try {
            const response = await api.post('/auth/register', {
                ...payload.userData,
                firebaseIdToken: payload.firebaseIdToken,
            });
            const { access_token, user } = response.data;

            await SecureStore.setItemAsync('token', access_token);
            await SecureStore.setItemAsync('user', JSON.stringify(user));

            set({ user, token: access_token, isAuthenticated: true });
        } catch (error) {
            console.error("Register Error:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    sendOtp: async (phoneNumber, recaptchaVerifier) => {
        set({ isLoading: true });
        try {
            // Double check: If the singleton didn't initialize, we can't send OTP
            if (!firebaseAuth) {
                throw new Error("Firebase Auth is not initialized yet.");
            }

            const phoneProvider = new PhoneAuthProvider(firebaseAuth);
            const verificationId = await phoneProvider.verifyPhoneNumber(
                phoneNumber,
                recaptchaVerifier
            );
            set({ verificationId });
        } catch (error: any) {
            console.error("Firebase sendOtp Error:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    verifyOtp: async (code, userData) => {
        set({ isLoading: true });
        try {
            const verId = get().verificationId;
            if (!verId) {
                throw new Error('No OTP was sent. Please request a new one.');
            }

            // Create credential and sign in with Firebase
            const credential = PhoneAuthProvider.credential(verId, code);
            const userCredential = await signInWithCredential(firebaseAuth, credential);
            const firebaseUser = userCredential.user;

            // Get Firebase ID token to send to our backend
            const firebaseIdToken = await firebaseUser.getIdToken();

            // Register with our backend
            await get().register({ userData, firebaseIdToken });

            // Clear verification state
            set({ verificationId: null });
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
        set({ user: null, token: null, isAuthenticated: false, verificationId: null });
    },

    checkLogin: async () => {
        set({ isLoading: true });
        try {
            const token = await SecureStore.getItemAsync('token');
            const userStr = await SecureStore.getItemAsync('user');

            if (token && userStr) {
                // Optional: Ping backend here to verify the token is still alive
                // await api.get('/auth/validate', { headers: { Authorization: `Bearer ${token}` } });
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
