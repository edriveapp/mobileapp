import * as Location from 'expo-location';
import { Alert } from 'react-native';

// Default fallback location (Port Harcourt)
const DEFAULT_COORDS = {
  latitude: 4.8156,
  longitude: 7.0498,
};

// Emergency numbers mapping based on state
const EMERGENCY_NUMBERS: Record<string, { police: string; ambulance: string; fire: string }> = {
  'Rivers': { police: '08033004000', ambulance: '112', fire: '112' },
  'Lagos': { police: '08009119111', ambulance: '112', fire: '767' },
  'FCT': { police: '08009119111', ambulance: '112', fire: '112' },
  'default': { police: '112', ambulance: '112', fire: '112' },
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

  /**
   * 3. Get Emergency Numbers based on the detected State string
   */
  getEmergencyNumbers: (locationString: string) => {
    // Simple check: does the location string contain "Lagos", "Rivers", etc?
    if (locationString.includes('Lagos')) return EMERGENCY_NUMBERS['Lagos'];
    if (locationString.includes('Rivers') || locationString.includes('Port Harcourt')) return EMERGENCY_NUMBERS['Rivers'];
    if (locationString.includes('Abuja') || locationString.includes('FCT')) return EMERGENCY_NUMBERS['FCT'];
    
    return EMERGENCY_NUMBERS['default'];
  }
};