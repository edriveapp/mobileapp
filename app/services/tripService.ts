import { Trip } from '../types';

// Mock delay to simulate network request
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const TripService = {
    fetchTrips: async (): Promise<Trip[]> => {
        await delay(1000);
        return []; // Store generic mock data handles initial state
    },

    createTrip: async (trip: any): Promise<boolean> => {
        await delay(1000);
        return true;
    },

    joinTrip: async (tripId: string, userId: string): Promise<boolean> => {
        await delay(1000);
        return true;
    },
};
