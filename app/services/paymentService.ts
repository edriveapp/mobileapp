import api from './api';

export const PaymentService = {
    calculateSplit: (totalFare: number, ridersCount: number): number => {
        if (ridersCount === 0) return totalFare;
        return Math.ceil(totalFare / (ridersCount + 1));
    },

    processPayment: async (amount: number, rideId: string, distance = 0) => {
        const response = await api.post('/payments/initialize', { amount, rideId, distance });
        return response.data?.data;
    },
};
