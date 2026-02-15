import { create } from 'zustand';
import api from '../services/api';

interface PaymentState {
    amount: number;
    isProcessing: boolean;
    paymentStatus: 'idle' | 'success' | 'failed';
    processPayment: (amount: number) => Promise<any>;
    resetStatus: () => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
    amount: 0,
    isProcessing: false,
    paymentStatus: 'idle',

    processPayment: async (amount: number) => {
        set({ isProcessing: true, amount });
        try {
            const response = await api.post('/payments/initialize', { amount });
            const { authorization_url, reference } = response.data.data;

            // In a real app, open authorization_url in Browser/WebView
            console.log("Payment URL:", authorization_url);

            // For MVP, if using mock:
            // If reference starts with mock, just succeed.
            // Else, await verification or polling.

            set({ isProcessing: false, paymentStatus: 'success' });
            return authorization_url; // Return URL for component to handle (e.g. open WebBrowser)
        } catch (error) {
            console.error("Payment Error:", error);
            set({ isProcessing: false, paymentStatus: 'failed' });
            throw error;
        }
    },

    resetStatus: () => set({ paymentStatus: 'idle', amount: 0 }),
}));
