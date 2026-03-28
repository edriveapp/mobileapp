import { User } from '../types';
import api from './api';

export const AuthService = {
    login: async (email: string, password: string): Promise<User> => {
        const response = await api.post('/auth/login', { email, password });
        return response.data?.user;
    },

    signup: async (name: string, email: string, phoneNumber: string, role: 'driver' | 'passenger', password?: string): Promise<User> => {
        const payload = {
            name,
            email,
            phone: phoneNumber,
            role,
            password,
        };
        const response = await api.post('/auth/register', payload);
        return response.data?.user;
    },
};
