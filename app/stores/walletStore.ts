import { create } from 'zustand';

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
    fundWallet: (amount: number) => void;
    payCommission: () => void;
    addCommissionDebt: (amount: number) => void;
    isAccountAtRisk: () => boolean; // Checks the 30-day rule
}

export const useWalletStore = create<WalletState>((set, get) => ({
    balance: 25000, // Mock initial balance
    commissionDue: 4500, // Mock initial debt
    lastCommissionPaymentDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days ago
    transactions: [
        {
            id: 'tx-1',
            type: 'credit',
            amount: 50000,
            date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
            description: 'Wallet Funding',
        },
        {
            id: 'tx-2',
            type: 'commission_deduction',
            amount: 2500,
            date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
            description: 'Commission Payment - Trip #1023',
        },
    ],

    fundWallet: (amount) => {
        set((state) => ({
            balance: state.balance + amount,
            transactions: [
                {
                    id: `tx-${Date.now()}`,
                    type: 'credit',
                    amount,
                    date: new Date().toISOString(),
                    description: 'Wallet Funding',
                },
                ...state.transactions,
            ],
        }));
    },

    payCommission: () => {
        const { balance, commissionDue } = get();
        if (balance >= commissionDue && commissionDue > 0) {
            set((state) => ({
                balance: state.balance - commissionDue,
                commissionDue: 0,
                lastCommissionPaymentDate: new Date().toISOString(),
                transactions: [
                    {
                        id: `tx-${Date.now()}`,
                        type: 'commission_deduction',
                        amount: commissionDue,
                        date: new Date().toISOString(),
                        description: 'Full Commission Payment',
                    },
                    ...state.transactions,
                ],
            }));
        }
    },

    addCommissionDebt: (amount) => {
        set((state) => ({ commissionDue: state.commissionDue + amount }));
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
}));
