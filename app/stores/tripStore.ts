import { create } from 'zustand';
import api from '../services/api';
import { Trip } from '../types';
import { useAuthStore } from './authStore';

// --- 1. Types & Interfaces ---

export type RideStatus = 'IDLE' | 'SEARCHING' | 'ACCEPTED' | 'ARRIVING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface RideRequest {
    origin: { lat: number; lon: number; address: string };
    destination: { lat: number; lon: number; address: string };
    tier: 'Lite' | 'Comfort' | 'Van';
    price: number;
    tripFare?: number;
    distanceKm?: number;
    departureTime?: string; // ISO string
    notes?: string;
    preferences?: {
        shared?: boolean;
    };
}

export interface DriverLocation {
    id: string;
    userId?: string;
    name?: string;
    vehicle?: string;
    plateNumber?: string;
    coords: { latitude: number; longitude: number };
    heading: number;
}

const toAddressObject = (value: any) => {
    if (value && typeof value === 'object') {
        return {
            lat: Number(value.lat ?? 0),
            lon: Number(value.lon ?? 0),
            address: String(value.address ?? ''),
        };
    }
    return {
        lat: 0,
        lon: 0,
        address: String(value ?? ''),
    };
};

const normalizeTrip = (ride: any) => {
    const origin = toAddressObject(ride.origin);
    const destination = toAddressObject(ride.destination);
    const departure = ride.departureTime ? new Date(ride.departureTime) : null;

    return {
        ...ride,
        origin,
        destination,
        price: Number(ride.price ?? ride.fare ?? 0),
        fare: Number(ride.fare ?? ride.price ?? 0),
        seats: typeof ride.seats === 'number' ? ride.seats : Number(ride.seats ?? 1),
        availableSeats:
            typeof ride.availableSeats === 'number'
                ? ride.availableSeats
                : Number(ride.availableSeats ?? ride.seats ?? 1),
        date: ride.date ?? (departure ? departure.toLocaleDateString() : ''),
        time: ride.time ?? (departure ? departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
    };
};

const normalizeDriverLocation = (driver: any): DriverLocation | null => {
    const coordinates = driver?.currentLocation?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
        return null;
    }

    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return null;
    }

    const fullName = [driver?.user?.firstName, driver?.user?.lastName].filter(Boolean).join(' ').trim();

    return {
        id: driver?.user?.id || driver?.id,
        userId: driver?.user?.id || driver?.id,
        name: fullName || driver?.user?.name || driver?.user?.email || 'Driver',
        vehicle: driver?.vehicleDetails?.model || '',
        plateNumber: driver?.vehicleDetails?.plateNumber || '',
        coords: {
            latitude,
            longitude,
        },
        heading: Number(driver?.heading ?? 0),
    };
};

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
    acceptRide: (rideId: string) => Promise<any>;
    bookTrip: (rideId: string, payload: any) => Promise<any>;
    postTrip: (tripData: any) => Promise<void>;
    createTrip: (tripData: any) => Promise<void>;
    updateTrip: (rideId: string, tripData: any) => Promise<any>;
    updateRideRequest: (rideId: string, requestData: any) => Promise<any>;
    updateTripStatus: (rideId: string, status: string) => Promise<any>;
    submitRating: (rideId: string, raterId: string, rateeId: string, value: number, comment: string) => Promise<void>;
    prependAvailableRide: (ride: any) => void;

    // State Setters (called by SocketService)
    updateRideStatus: (status: RideStatus, data?: any) => void;
}

// Deduplication guard — prevents concurrent fetchMyTrips calls from mount + polling
let fetchMyTripsInFlight = false;

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
        await get().fetchAvailableTrips({ role: 'rider', ...(filters || {}) });
    },

    fetchAvailableTrips: async (filters) => {
        set({ isLoading: true, error: null });
        try {
            // We need to know if we are searching as a driver or rider. 
            // Better to pass it or get from authStore. But simpler to pass in filters.
            const response = await api.get('/rides/available', { params: filters });
            const normalized = Array.isArray(response.data)
                ? response.data.map(normalizeTrip)
                : [];
            set({
                availableTrips: normalized,
                trips: normalized,
                // We derive trending trips from the available list (e.g., top 5)
                // or you can point this to a specific /rides/trending endpoint
                trendingTrips: normalized.slice(0, 8)
            });
        } catch (error: any) {
            console.error("Fetch Available Trips Error:", error);
            set({ error: error.message || "Failed to load trips" });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchMyTrips: async () => {
        if (fetchMyTripsInFlight) return;

        const token = useAuthStore.getState().token;
        if (!token) {
            set({
                activeTrips: [],
                history: [],
                currentRide: null,
                rideStatus: 'IDLE',
                isLoading: false,
            });
            return;
        }

        fetchMyTripsInFlight = true;
        set({ isLoading: true, error: null });
        try {
            const response = await api.get('/rides/my-rides', { timeout: 8000 });
            const active = Array.isArray(response.data.active)
                ? response.data.active.map(normalizeTrip)
                : [];
            const history = Array.isArray(response.data.history)
                ? response.data.history.map(normalizeTrip)
                : [];

            set({
                activeTrips: active,
                history,
            });

            const ongoingRide = active.find((r: any) =>
                ['searching', 'accepted', 'arrived', 'in_progress'].includes(String(r.status).toLowerCase())
            );

            if (ongoingRide) {
                set({
                    currentRide: ongoingRide,
                    rideStatus: String(ongoingRide.status).toUpperCase() as RideStatus
                });
            }

        } catch (error: any) {
            if (error?.response?.status === 401) {
                set({
                    activeTrips: [],
                    history: [],
                    currentRide: null,
                    rideStatus: 'IDLE',
                });
                return;
            }
            // Suppress timeout/network noise from background polling
            if (error?.code !== 'ECONNABORTED' && !String(error?.message).includes('timeout')) {
                console.error("Fetch My Trips Error:", error?.message || "Unknown error");
            }
        } finally {
            fetchMyTripsInFlight = false;
            set({ isLoading: false });
        }
    },

    fetchNearbyDrivers: async (lat, lon) => {
        try {
            const response = await api.get('/users/drivers/nearby', { params: { lat, lon } });
            const normalized = Array.isArray(response.data)
                ? response.data
                    .map(normalizeDriverLocation)
                    .filter(Boolean) as DriverLocation[]
                : [];
            set({ activeDrivers: normalized });
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

    acceptRide: async (rideId) => {
        set({ isLoading: true, error: null });
        try {
            let response;
            try {
                response = await api.patch(`/rides/${rideId}/accept`);
            } catch (error: any) {
                const message = String(error?.message || '').toLowerCase();
                const status = Number(error?.response?.status || 0);

                if (status === 404 || message.includes("can't patch")) {
                    response = await api.post(`/rides/${rideId}/accept`);
                } else {
                    throw error;
                }
            }
            await get().fetchAvailableTrips({ role: 'driver' });
            await get().fetchMyTrips();
            return response.data;
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    bookTrip: async (rideId, payload) => {
        set({ isLoading: true, error: null });
        try {
            let response;
            try {
                response = await api.post(`/rides/${rideId}/book`, payload);
            } catch (error: any) {
                const message = String(error?.message || '').toLowerCase();
                const status = Number(error?.response?.status || 0);

                if (status === 404 || message.includes("can't post")) {
                    try {
                        response = await api.post(`/rides/book/${rideId}`, payload);
                    } catch {
                        response = await api.patch(`/rides/${rideId}/book`, payload);
                    }
                } else {
                    throw error;
                }
            }
            const normalized = normalizeTrip(response.data);
            set({
                currentRide: normalized,
                rideStatus: 'ACCEPTED',
            });
            await get().fetchTrips({ role: 'rider' });
            await get().fetchMyTrips();
            return normalized;
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
            throw error;
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

    createTrip: async (tripData) => {
        await get().postTrip(tripData);
    },

    updateTrip: async (rideId, tripData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.patch(`/rides/${rideId}`, tripData);
            await get().fetchMyTrips();
            await get().fetchAvailableTrips({ role: 'rider' });
            return response.data;
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    updateRideRequest: async (rideId, requestData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.patch(`/rides/${rideId}/request`, requestData);
            const normalized = normalizeTrip(response.data);
            set({
                currentRide: normalized,
                rideStatus: 'SEARCHING',
            });
            await get().fetchMyTrips();
            return normalized;
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    updateTripStatus: async (rideId, status) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.patch(`/rides/${rideId}/status`, { status });
            await get().fetchMyTrips();
            await get().fetchAvailableTrips({ role: 'rider' });
            await get().fetchAvailableTrips({ role: 'driver' });
            return response.data;
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
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
    },

    prependAvailableRide: (ride) => {
        const normalized = normalizeTrip(ride);
        set((state) => {
            const existing = state.availableTrips.filter((item: any) => item.id !== normalized.id);
            return {
                availableTrips: [normalized, ...existing],
                trips: [normalized, ...state.trips.filter((item: any) => item.id !== normalized.id)],
                trendingTrips: [normalized, ...state.trendingTrips.filter((item: any) => item.id !== normalized.id)].slice(0, 8),
            };
        });
    },
}));
