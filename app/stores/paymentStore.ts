import { create } from 'zustand';

interface PaymentState {
    amount: number;
    isProcessing: boolean;
    paymentStatus: 'idle' | 'success' | 'failed';
    processPayment: (amount: number) => Promise<void>;
    resetStatus: () => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
    amount: 0,
    isProcessing: false,
    paymentStatus: 'idle',

    processPayment: async (amount: number) => {
        set({ isProcessing: true, amount });
        // Simulate API call via service (or direct mock here for simplicity)
        await new Promise((resolve) => setTimeout(resolve, 1500));
        set({ isProcessing: false, paymentStatus: 'success' });
    },

    resetStatus: () => set({ paymentStatus: 'idle', amount: 0 }),
}));
