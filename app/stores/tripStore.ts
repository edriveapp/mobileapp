import { create } from 'zustand';
import api from '../services/api';
import { Trip } from '../types';

// --- 1. Types & Interfaces ---

export type RideStatus = 'IDLE' | 'SEARCHING' | 'ACCEPTED' | 'ARRIVING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface RideRequest {
    origin: { lat: number; lon: number; address: string };
    destination: { lat: number; lon: number; address: string };
    tier: 'Lite' | 'Comfort' | 'Van';
    price: number;
    departureTime?: string; // ISO string
}

export interface DriverLocation {
    id: string;
    coords: { latitude: number; longitude: number };
    heading: number;
}
interface TripState {
    // Lists
    trips: Trip[];
    availableTrips: Trip[];
    trendingTrips: Trip[];   // <--- Added for JoinRideView
    activeTrips: any[];
    history: any[];
    activeDrivers: DriverLocation[];

    // Active Ride State (Passenger)
    currentRide: any | null;
    rideStatus: RideStatus;

    // UI States
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchTrips: (filters?: any) => Promise<void>;
    fetchAvailableTrips: (filters?: any) => Promise<void>;
    fetchMyTrips: () => Promise<void>;
    fetchNearbyDrivers: (lat: number, lon: number) => Promise<void>;

    // Ride Actions
    requestRide: (request: RideRequest) => Promise<void>;
    cancelRide: (rideId?: string) => Promise<void>;
    postTrip: (tripData: any) => Promise<void>;
    submitRating: (rideId: string, raterId: string, rateeId: string, value: number, comment: string) => Promise<void>;

    // State Setters (called by SocketService)
    updateRideStatus: (status: RideStatus, data?: any) => void;
}

// --- 2. Store Implementation ---

export const useTripStore = create<TripState>((set, get) => ({
    // Initial State
    trips: [],
    availableTrips: [],
    trendingTrips: [],       // <--- Initialized
    activeTrips: [],
    history: [],
    activeDrivers: [],
    currentRide: null,
    rideStatus: 'IDLE',
    isLoading: false,
    error: null,

    // --- Fetch Actions ---

    fetchTrips: async (filters) => {
        await get().fetchAvailableTrips(filters);
    },

    fetchAvailableTrips: async (filters) => {
        set({ isLoading: true, error: null });
        try {
            // We need to know if we are searching as a driver or rider. 
            // Better to pass it or get from authStore. But simpler to pass in filters.
            const response = await api.get('/rides/available', { params: filters });
            set({
                availableTrips: response.data,
                trips: response.data,
                // We derive trending trips from the available list (e.g., top 5)
                // or you can point this to a specific /rides/trending endpoint
                trendingTrips: response.data.slice(0, 5)
            });
        } catch (error: any) {
            console.error("Fetch Available Trips Error:", error);
            set({ error: error.message || "Failed to load trips" });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchMyTrips: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get('/rides/my-rides');
            set({
                activeTrips: response.data.active || [],
                history: response.data.history || []
            });

            const ongoingRide = response.data.active.find((r: any) =>
                ['SEARCHING', 'ACCEPTED', 'ARRIVING', 'IN_PROGRESS'].includes(r.status)
            );

            if (ongoingRide) {
                set({
                    currentRide: ongoingRide,
                    rideStatus: ongoingRide.status as RideStatus
                });
            }

        } catch (error: any) {
            console.error("Fetch My Trips Error:", error);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchNearbyDrivers: async (lat, lon) => {
        try {
            const response = await api.get('/users/drivers/nearby', { params: { lat, lon } });
            set({ activeDrivers: response.data });
        } catch (error) {
            console.log("Error fetching drivers:", error);
        }
    },

    // --- Ride Flow Actions ---

    requestRide: async (request) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/rides/request', request);
            set({
                currentRide: response.data,
                rideStatus: 'SEARCHING'
            });
        } catch (error: any) {
            set({ rideStatus: 'IDLE', error: error.response?.data?.message || error.message });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    cancelRide: async (rideId) => {
        const idToCancel = rideId || get().currentRide?.id;
        if (!idToCancel) return;

        set({ isLoading: true });
        try {
            await api.patch(`/rides/${idToCancel}/cancel`);
            set({
                rideStatus: 'IDLE',
                currentRide: null
            });
            await get().fetchMyTrips();
        } catch (error: any) {
            set({ error: error.message });
            console.error("Cancel Ride Error:", error);
        } finally {
            set({ isLoading: false });
        }
    },

    postTrip: async (tripData) => {
        set({ isLoading: true, error: null });
        try {
            await api.post('/rides/publish', tripData);
            await get().fetchMyTrips();
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    submitRating: async (rideId, raterId, rateeId, value, comment) => {
        try {
            await api.post('/ratings', { rideId, raterId, rateeId, value, comment });
        } catch (error) {
            console.log("Rating Error:", error);
            throw error;
        }
    },

    updateRideStatus: (status, data) => {
        set((state) => ({
            rideStatus: status,
            currentRide: data ? { ...state.currentRide, ...data } : state.currentRide
        }));
    }
}));