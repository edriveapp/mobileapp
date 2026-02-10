import { create } from 'zustand';
import { Trip } from '../types';

interface TripState {
    trips: Trip[];
    trendingTrips: Trip[]; // <--- NEW: State for trending items
    selectedTrip: Trip | null;
    isLoading: boolean;
    userJoinedTripIds: string[];
    
    fetchTrips: () => Promise<void>;
    createTrip: (trip: Omit<Trip, 'id' | 'riders' | 'availableSeats' | 'status'>) => void;
    joinTrip: (tripId: string, userId: string) => Promise<void>;
    setLoading: (loading: boolean) => void;
}

// 1. STANDARD TRIPS (For general search)
const INITIAL_TRIPS: Trip[] = [
    {
        id: 'trip-1',
        driverId: 'driver-1',
        origin: 'Lagos',
        destination: 'Abuja',
        date: '2023-11-20',
        time: '08:00',
        price: 15000,
        seats: 3,
        availableSeats: 3,
        riders: [],
        status: 'scheduled',
    },
    {
        id: 'trip-2',
        driverId: 'driver-2',
        origin: 'Ibadan',
        destination: 'Lagos',
        date: '2023-11-21',
        time: '10:00',
        price: 5000,
        seats: 4,
        availableSeats: 1,
        riders: [],
        status: 'scheduled',
    },
];

// 2. TRENDING TRIPS (Matches your Screenshot)
const TRENDING_TRIPS: Trip[] = [
    {
        id: 'trend-1',
        driverId: 'd-trend-1',
        destination: 'Federal University of Technology Owerri',
        origin: 'Artillery, Port Harcourt',
        date: 'Jan 18, 2026',
        time: '09:00 AM',
        price: 4500,
        seats: 4,
        availableSeats: 4,
        riders: [],
        status: 'scheduled',
    },
    {
        id: 'trend-2',
        driverId: 'd-trend-2',
        destination: 'Redemption Camp 2026',
        origin: 'Garrison, Port Harcourt',
        date: 'Feb 12, 2026',
        time: '07:00 AM',
        price: 15000,
        seats: 18, // Bus
        availableSeats: 12,
        riders: [],
        status: 'scheduled',
    },
    {
        id: 'trend-3',
        driverId: 'd-trend-3',
        destination: 'University of Uyo',
        origin: 'Garrison, Port Harcourt',
        date: 'Feb 12, 2026',
        time: '10:00 AM',
        price: 6000,
        seats: 4,
        availableSeats: 2,
        riders: [],
        status: 'scheduled',
    },
];

export const useTripStore = create<TripState>((set, get) => ({
    trips: INITIAL_TRIPS,
    trendingTrips: TRENDING_TRIPS, // <--- Initialize here
    selectedTrip: null,
    isLoading: false,
    userJoinedTripIds: [],

    setLoading: (loading) => set({ isLoading: loading }),

    fetchTrips: async () => {
        set({ isLoading: true });
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        // In a real app, you would fetch both standard and trending trips here
        // const response = await api.getTrips();
        // set({ trips: response.all, trendingTrips: response.trending });
        
        set({ isLoading: false });
    },

    createTrip: (tripData) => {
        const newTrip: Trip = {
            ...tripData,
            id: `trip-${Date.now()}`,
            availableSeats: tripData.seats,
            riders: [],
            status: 'scheduled',
            driverId: 'current-user', // Fallback ID
        };
        set((state) => ({ trips: [newTrip, ...state.trips] }));
    },

    joinTrip: async (tripId: string, userId: string) => {
        const { trips, trendingTrips, userJoinedTripIds } = get();
        
        // Check both lists
        let isTrending = false;
        let tripIndex = trips.findIndex((t) => t.id === tripId);
        
        if (tripIndex === -1) {
            tripIndex = trendingTrips.findIndex((t) => t.id === tripId);
            isTrending = true;
        }

        if (tripIndex === -1) {
            throw new Error('Trip not found');
        }

        const listToUpdate = isTrending ? trendingTrips : trips;
        const trip = listToUpdate[tripIndex];

        if (userJoinedTripIds.includes(tripId)) {
            throw new Error('You have already joined this trip');
        }

        if (trip.availableSeats <= 0) {
            throw new Error('No seats available');
        }

        const updatedTrip = {
            ...trip,
            availableSeats: trip.availableSeats - 1,
            riders: [...trip.riders, userId],
        };

        // Create new arrays to update state immutably
        if (isTrending) {
            const updatedTrending = [...trendingTrips];
            updatedTrending[tripIndex] = updatedTrip;
            set({ trendingTrips: updatedTrending });
        } else {
            const updatedTrips = [...trips];
            updatedTrips[tripIndex] = updatedTrip;
            set({ trips: updatedTrips });
        }

        set((state) => ({
            userJoinedTripIds: [...state.userJoinedTripIds, tripId],
            selectedTrip: updatedTrip,
        }));

        await new Promise((resolve) => setTimeout(resolve, 1000));
    },
}));