import axios from "axios";
import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";
import { useAuthStore } from "../stores/authStore";

/**
 * 1. DYNAMIC BASE URL
 * Instead of hardcoding 192.168.1.5, we detect the machine's IP.
 * This fixes ERR_NETWORK when your computer's IP changes.
 */
export const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  // React Native runtime bundle URL (very reliable in dev client / Metro).
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  const scriptHost = scriptURL?.match(/^https?:\/\/([^/:]+)/)?.[1];

  // Auto-detect local IP from Expo's packager config.
  const debuggerHost =
    scriptHost ||
    Constants.expoConfig?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost ||
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost;
  
  if (debuggerHost?.includes('.exp.direct')) {
    console.warn('⚠️ TUNNEL DETECTED: You are running an Expo tunnel. The backend at port 3000 cannot be reached via this tunnel unless you use EXPO_PUBLIC_API_URL with a backend tunnel (like ngrok). API requests will likely timeout!');
  }

  const host = debuggerHost ? debuggerHost.split(":")[0] : "";
  const isLoopbackHost =
    host === "localhost" || host === "127.0.0.1" || host === "::1";
  const fallbackHost = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
  const ip = host && !isLoopbackHost ? host : fallbackHost;

  if (isLoopbackHost && !process.env.EXPO_PUBLIC_API_URL) {
    console.warn(
      "⚠️ API host resolved to loopback. If testing on a physical device, set EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3000"
    );
  }

  return `http://${ip}:3000`;
};

export const getSocketBaseUrl = getBaseUrl;

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 20000,
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
  (error) => Promise.reject(error),
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

    // Format error for UI in a consistent string shape.
    const rawMessage = error.response?.data?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(", ")
      : typeof rawMessage === "string"
        ? rawMessage
        : error.message || "Something went wrong";

    return Promise.reject({ ...error, message });
  },
);

export default api;
