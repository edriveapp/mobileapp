// Mock Emergency Numbers Mapping
const EMERGENCY_NUMBERS: Record<string, { police: string; ambulance: string; fire: string }> = {
    'Lagos': { police: '112', ambulance: '123', fire: '119' },
    'Abuja': { police: '0800', ambulance: '0900', fire: '0700' },
    'Rivers': { police: '112', ambulance: '112', fire: '112' },
    // Default fallbacks
    'Nigeria': { police: '112', ambulance: '112', fire: '119' },
};

export const LocationService = {
    getCurrentState: async (): Promise<string> => {
        // In a real app, use IP geolocation API or Device Location
        // const response = await fetch('https://ipapi.co/json/');
        // const data = await response.json();
        // return data.region;

        // Mock return
        return 'Lagos';
    },

    getEmergencyNumbers: (state: string) => {
        return EMERGENCY_NUMBERS[state] || EMERGENCY_NUMBERS['Nigeria'];
    }
};
