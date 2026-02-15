import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../stores/authStore';

/**
 * 1. DYNAMIC BASE URL
 * Instead of hardcoding 192.168.1.5, we detect the machine's IP.
 * This fixes ERR_NETWORK when your computer's IP changes.
 */
const getBaseUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

    // Auto-detect local IP from Expo's packager
    const debuggerHost = Constants.expoConfig?.hostUri;
    const ip = debuggerHost ? debuggerHost.split(':')[0] : '192.168.1.5';

    return `http://${ip}:3000`;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

/**
 * 2. REQUEST INTERCEPTOR (PRESERVED)
 * Automatically attaches the Bearer token from Zustand store.
 */
api.interceptors.request.use(
    async (config) => {
        const state = useAuthStore.getState();
        const token = state.token;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * 3. RESPONSE INTERCEPTOR (PRESERVED & ENHANCED)
 * Handles 401 Unauthorized by logging the user out.
 */
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 (Unauthorized) - Token expired or invalid
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Log the user out immediately via store
            useAuthStore.getState().logout();
        }

        // Format error for UI
        const message = error.response?.data?.message || error.message || 'Something went wrong';

        return Promise.reject({ ...error, message });
    }
);

export default api;