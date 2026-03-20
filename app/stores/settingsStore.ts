import { create } from 'zustand';
import api from '../services/api';
import { useAuthStore } from './authStore';

export interface SavedPlace {
    id: string;
    label: string;
    address: string;
    lat: number;
    lon: number;
    icon: string;
}

export interface Preferences {
    pushNotifications: boolean;
    emailNotifications: boolean;
    otaUpdates: boolean;
}

interface SettingsState {
    preferences: Preferences;
    savedPlaces: SavedPlace[];
    isLoading: boolean;

    // Actions
    fetchPreferences: () => Promise<void>;
    updatePreference: (key: keyof Preferences, value: boolean) => Promise<void>;
    fetchSavedPlaces: () => Promise<void>;
    addSavedPlace: (data: Omit<SavedPlace, 'id'>) => Promise<void>;
    deleteSavedPlace: (id: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    preferences: {
        pushNotifications: true,
        emailNotifications: true,
        otaUpdates: true,
    },
    savedPlaces: [],
    isLoading: false,

    fetchPreferences: async () => {
        const token = useAuthStore.getState().token;
        if (!token) {
            set({
                preferences: {
                    pushNotifications: true,
                    emailNotifications: true,
                    otaUpdates: true,
                },
            });
            return;
        }

        try {
            const response = await api.get('/users/me');
            if (response.data?.preferences) {
                set({ preferences: response.data.preferences });
            }
        } catch (error: any) {
            if (error?.response?.status === 401) return;
            console.error('Failed to fetch preferences:', error?.message || 'Unknown error');
        }
    },

    updatePreference: async (key, value) => {
        // Optimistic update
        const prev = get().preferences;
        set({ preferences: { ...prev, [key]: value } });

        try {
            await api.patch('/users/preferences', { [key]: value });
        } catch (error) {
            // Revert on failure
            set({ preferences: prev });
            console.error('Failed to update preference:', error);
        }
    },

    fetchSavedPlaces: async () => {
        const token = useAuthStore.getState().token;
        if (!token) {
            set({ savedPlaces: [], isLoading: false });
            return;
        }

        set({ isLoading: true });
        try {
            const response = await api.get('/users/saved-places');
            set({ savedPlaces: response.data });
        } catch (error: any) {
            if (error?.response?.status === 401) {
                set({ savedPlaces: [] });
                return;
            }
            console.error('Failed to fetch saved places:', error?.message || 'Unknown error');
        } finally {
            set({ isLoading: false });
        }
    },

    addSavedPlace: async (data) => {
        try {
            const response = await api.post('/users/saved-places', data);
            set((state) => ({
                savedPlaces: [...state.savedPlaces, response.data],
            }));
        } catch (error: any) {
            console.error('Failed to add saved place:', error?.message || 'Unknown error');
            throw error;
        }
    },

    deleteSavedPlace: async (id) => {
        const prev = get().savedPlaces;
        // Optimistic removal
        set({ savedPlaces: prev.filter((p) => p.id !== id) });

        try {
            await api.delete(`/users/saved-places/${id}`);
        } catch (error: any) {
            set({ savedPlaces: prev });
            console.error('Failed to delete saved place:', error?.message || 'Unknown error');
            throw error;
        }
    },
}));
