import { create } from 'zustand';
import { Trip } from '../types';

interface TripState {
    trips: Trip[];
    selectedTrip: Trip | null;
    isLoading: boolean;
    userJoinedTripIds: string[]; // Track joined trips locally for MVP
    fetchTrips: () => Promise<void>;
    createTrip: (trip: Omit<Trip, 'id' | 'riders' | 'availableSeats' | 'status'>) => void;
    joinTrip: (tripId: string, userId: string) => Promise<void>;
    setLoading: (loading: boolean) => void;
}

// Mock initial data
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

export const useTripStore = create<TripState>((set, get) => ({
    trips: INITIAL_TRIPS,
    selectedTrip: null,
    isLoading: false,
    userJoinedTripIds: [],

    setLoading: (loading) => set({ isLoading: loading }),

    fetchTrips: async () => {
        set({ isLoading: true });
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        set({ isLoading: false });
        // In a real app, we would fetch from API and updates trips
    },

    createTrip: (tripData: Omit<Trip, 'id' | 'riders' | 'availableSeats' | 'status'>) => {
        const newTrip: Trip = {
            ...tripData,
            id: `trip-${Date.now()}`,
            availableSeats: tripData.seats,
            riders: [],
            status: 'scheduled',
        };
        set((state) => ({ trips: [newTrip, ...state.trips] }));
    },

    joinTrip: async (tripId: string, userId: string) => {
        const { trips, userJoinedTripIds } = get();
        const tripIndex = trips.findIndex((t) => t.id === tripId);

        if (tripIndex === -1) {
            throw new Error('Trip not found');
        }

        const trip = trips[tripIndex];

        // Optimistic checks
        if (userJoinedTripIds.includes(tripId)) {
            throw new Error('You have already joined this trip');
        }

        if (trip.availableSeats <= 0) {
            throw new Error('No seats available');
        }

        // Optimistic update
        const updatedTrip = {
            ...trip,
            availableSeats: trip.availableSeats - 1,
            riders: [...trip.riders, userId],
        };

        const updatedTrips = [...trips];
        updatedTrips[tripIndex] = updatedTrip;

        set({
            trips: updatedTrips,
            userJoinedTripIds: [...userJoinedTripIds, tripId],
            selectedTrip: updatedTrip, // Update selected trip if it's the one being viewed
        });

        // Simulate API Call
        await new Promise((resolve) => setTimeout(resolve, 1000));
    },
}));
