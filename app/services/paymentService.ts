// Mock Payment Service

export const PaymentService = {
    calculateSplit: (totalFare: number, ridersCount: number): number => {
        if (ridersCount === 0) return totalFare;
        return Math.ceil(totalFare / (ridersCount + 1)); // including driver? or just riders. 
        // Usually it's Rider Fare = (Total Cost / Seats).
    },

    processPayment: async (amount: number, userId: string): Promise<boolean> => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return true; // Always succeed for MVP
    },
};
