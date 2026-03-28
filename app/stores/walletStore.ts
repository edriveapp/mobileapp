import { create } from 'zustand';
import api from '../services/api';

export interface Transaction {
    id: string;
    type: 'credit' | 'debit' | 'commission_deduction';
    amount: number;
    date: string; // ISO String
    description: string;
}

interface WalletState {
    balance: number;
    commissionDue: number;
    lastCommissionPaymentDate: string | null; // ISO String
    transactions: Transaction[];

    // Actions
    fundWallet: (amount: number) => Promise<void>;
    payCommission: (amount?: number) => Promise<void>;
    addCommissionDebt: (amount: number) => Promise<void>;
    isAccountAtRisk: () => boolean; // Checks the 30-day rule
    fetchWallet: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
    balance: 0,
    commissionDue: 0,
    lastCommissionPaymentDate: null,
    transactions: [],

    fundWallet: async (amount) => {
        await api.post('/users/wallet/fund', { amount });
        await get().fetchWallet();
    },

    payCommission: async (amount) => {
        await api.post('/users/wallet/pay-commission', { amount });
        await get().fetchWallet();
    },

    addCommissionDebt: async (amount) => {
        await api.post('/users/wallet/add-debt', { amount });
        await get().fetchWallet();
    },

    isAccountAtRisk: () => {
        const { lastCommissionPaymentDate, commissionDue } = get();
        if (commissionDue <= 0) return false;
        if (!lastCommissionPaymentDate) return true; // Never paid? Risk.

        const lastPaid = new Date(lastCommissionPaymentDate).getTime();
        const now = Date.now();
        const daysSince = (now - lastPaid) / (1000 * 60 * 60 * 24);

        return daysSince > 30;
    },

    fetchWallet: async () => {
        try {
            const response = await api.get('/users/wallet');
            set({
                balance: Number(response.data.balance || 0),
                commissionDue: Number(response.data.commissionDue ?? response.data.pendingRemittance ?? 0),
                lastCommissionPaymentDate: response.data.lastCommissionPaymentDate || null,
                transactions: response.data.transactions || [],
            });
        } catch (error) {
            console.error("Fetch wallet error:", error);
        }
    },
}));
