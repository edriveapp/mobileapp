import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    hasFinishedSplash: boolean;
    login: (user: User) => void;
    logout: () => void;
    setLoading: (loading: boolean) => void;
    setFinishedSplash: (finished: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    hasFinishedSplash: false,
    login: (user) => set({ user, isAuthenticated: true }),
    logout: () => set({ user: null, isAuthenticated: false }),
    setLoading: (loading) => set({ isLoading: loading }),
    setFinishedSplash: (finished) => set({ hasFinishedSplash: finished }),
}));
