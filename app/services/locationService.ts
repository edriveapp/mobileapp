import * as Location from 'expo-location';
import { Alert } from 'react-native';

// Default fallback location (Port Harcourt)
const DEFAULT_COORDS = {
  latitude: 4.8156,
  longitude: 7.0498,
};

// State and city-aware emergency directory (falls back to national 112)
const EMERGENCY_BY_STATE: Record<string, { police: string; ambulance: string; fire: string }> = {
  Lagos: { police: '767, 112', ambulance: '767, 112', fire: '767' },
  FCT: { police: '112', ambulance: '112', fire: '112' },
  Rivers: { police: '112', ambulance: '112', fire: '112' },
  Ogun: { police: '112', ambulance: '112', fire: '112' },
  Oyo: { police: '615', ambulance: '615', fire: '615' },
  Kano: { police: '112', ambulance: '112', fire: '112' },
  Enugu: { police: '112', ambulance: '112', fire: '112' },
  default: { police: '112', ambulance: '112', fire: '112' },
};

const EMERGENCY_BY_CITY: Record<string, { police: string; ambulance: string; fire: string }> = {
  'Ikeja': { police: '767, 112', ambulance: '767, 112', fire: '767' },
  'Victoria Island': { police: '767, 112', ambulance: '767, 112', fire: '767' },
  'Lekki': { police: '767, 112', ambulance: '767, 112', fire: '767' },
  'Port Harcourt': { police: '112', ambulance: '112', fire: '112' },
  'Abuja': { police: '112', ambulance: '112', fire: '112' },
};

export const LocationService = {
  /**
   * 1. Request Permission & Get Current Coordinates
   * Returns: { latitude, longitude } or null if denied/error
   */
  getCurrentCoordinates: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to see nearby drivers.');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Balanced saves battery while being accurate enough for ride-hailing
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error("Error getting location:", error);
      return null;
    }
  },

  /**
   * 2. Get Current City/State Name (Reverse Geocoding)
   * Returns: "Port Harcourt, Rivers" or "Unknown Location"
   */
  getCurrentState: async (): Promise<string> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return 'Location Denied';

      const location = await Location.getCurrentPositionAsync({});
      
      // Reverse geocode to get address details
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address.length > 0) {
        const { city, region, subregion } = address[0];
        // Return City (e.g., Port Harcourt) or Region (e.g., Rivers)
        // Fallback logic to ensure we always show something useful
        return city || subregion || region || 'Unknown Location';
      }
      
      return 'Unknown Location';
    } catch (error) {
      console.warn("Reverse geocoding failed", error);
      return 'Detecting...';
    }
  },

  getCurrentLocationDetails: async (): Promise<{ city: string; state: string; area: string }> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { city: 'Unknown', state: 'Unknown', area: 'Location Denied' };
      }

      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (!address.length) {
        return { city: 'Unknown', state: 'Unknown', area: 'Unknown Location' };
      }

      const { city, region, subregion } = address[0];
      const safeCity = city || subregion || 'Unknown';
      const safeState = region || 'Unknown';
      const area = [safeCity, safeState].filter(Boolean).join(', ');

      return { city: safeCity, state: safeState, area: area || 'Unknown Location' };
    } catch {
      return { city: 'Unknown', state: 'Unknown', area: 'Detecting...' };
    }
  },

  /**
   * 3. Get Emergency Numbers based on the detected State string
   */
  getEmergencyNumbers: (locationString: string) => {
    const normalized = String(locationString || '').toLowerCase();
    const cityMatch = Object.entries(EMERGENCY_BY_CITY).find(([city]) =>
      normalized.includes(city.toLowerCase())
    );
    if (cityMatch) return cityMatch[1];

    const stateMatch = Object.entries(EMERGENCY_BY_STATE).find(([state]) =>
      normalized.includes(state.toLowerCase())
    );
    if (stateMatch) return stateMatch[1];

    return EMERGENCY_BY_STATE.default;
  },

  getEmergencyNumbersFromParts: (city: string, state: string) => {
    const byCity = EMERGENCY_BY_CITY[city];
    if (byCity) return byCity;

    const byState = EMERGENCY_BY_STATE[state];
    if (byState) return byState;

    return EMERGENCY_BY_STATE.default;
  }
};
