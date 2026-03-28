import { create } from 'zustand';
import api from '../services/api';

interface PaymentState {
    amount: number;
    isProcessing: boolean;
    paymentStatus: 'idle' | 'success' | 'failed';
    processPayment: (amount: number, options?: { rideId?: string; distance?: number }) => Promise<{ authorization_url: string; reference: string }>;
    verifyPayment: (reference: string) => Promise<boolean>;
    resetStatus: () => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
    amount: 0,
    isProcessing: false,
    paymentStatus: 'idle',

    processPayment: async (amount: number, options) => {
        set({ isProcessing: true, amount });
        try {
            const response = await api.post('/payments/initialize', {
                amount,
                rideId: options?.rideId,
                distance: options?.distance || 0,
            });
            const { authorization_url, reference } = response.data.data;
            set({ isProcessing: false, paymentStatus: 'idle' });
            return { authorization_url, reference };
        } catch (error) {
            console.error("Payment Error:", error);
            set({ isProcessing: false, paymentStatus: 'failed' });
            throw error;
        }
    },

    verifyPayment: async (reference: string) => {
        set({ isProcessing: true });
        try {
            let response;
            try {
                response = await api.get(`/payments/verify/${reference}`);
            } catch {
                response = await api.get('/payments/verify', { params: { reference } });
            }

            const isSuccess =
                response?.data?.data?.status === 'success' ||
                response?.data?.status === true;

            set({ isProcessing: false, paymentStatus: isSuccess ? 'success' : 'failed' });
            return isSuccess;
        } catch (error) {
            console.error('Payment verification error:', error);
            set({ isProcessing: false, paymentStatus: 'failed' });
            throw error;
        }
    },

    resetStatus: () => set({ paymentStatus: 'idle', amount: 0 }),
}));
