import { create } from 'zustand';
import api from '../services/api';

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
    biometricLogin: boolean;
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
        biometricLogin: false,
    },
    savedPlaces: [],
    isLoading: false,

    fetchPreferences: async () => {
        try {
            const response = await api.get('/users/me');
            if (response.data?.preferences) {
                set({ preferences: response.data.preferences });
            }
        } catch (error) {
            console.error('Failed to fetch preferences:', error);
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
        set({ isLoading: true });
        try {
            const response = await api.get('/users/saved-places');
            set({ savedPlaces: response.data });
        } catch (error) {
            console.error('Failed to fetch saved places:', error);
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
        } catch (error) {
            console.error('Failed to add saved place:', error);
            throw error;
        }
    },

    deleteSavedPlace: async (id) => {
        const prev = get().savedPlaces;
        // Optimistic removal
        set({ savedPlaces: prev.filter((p) => p.id !== id) });

        try {
            await api.delete(`/users/saved-places/${id}`);
        } catch (error) {
            set({ savedPlaces: prev });
            console.error('Failed to delete saved place:', error);
            throw error;
        }
    },
}));
