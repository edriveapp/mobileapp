import api from './api';

export const TripService = {
    async getHistory() {
        // Token is auto-attached!
        const response = await api.get('/rides/history'); 
        return response.data;
    },

    async requestRide(data: { origin: any, dest: any }) {
        const response = await api.post('/rides/request', data);
        return response.data;
    }
};