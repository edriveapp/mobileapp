import { User } from '../types';

// Mock delay to simulate network request
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const AuthService = {
    login: async (email: string, password: string): Promise<User> => {
        await delay(1000); // Simulate API call

        // Mock successful login
        return {
            id: 'user-123',
            name: 'John Doe',
            email: email,
            role: 'rider', // Default mock role
            phoneNumber: '+2348012345678',
            isVerified: true,
        };
    },

    signup: async (name: string, email: string, phoneNumber: string, role: 'driver' | 'rider'): Promise<User> => {
        await delay(1500); // Simulate API call

        return {
            id: `user-${Math.floor(Math.random() * 1000)}`,
            name,
            email,
            role,
            phoneNumber,
            isVerified: false,
        };
    },
};
