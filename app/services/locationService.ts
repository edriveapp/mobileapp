import * as Location from 'expo-location';
import { Alert } from 'react-native';

// Default fallback location (Port Harcourt)
const DEFAULT_COORDS = {
  latitude: 4.8156,
  longitude: 7.0498,
};

// Nigeria Police Force PRO numbers by state command (source: NPF official directory)
// Ambulance / fire fall back to national 112 where no dedicated line exists.
const POLICE_PRO: Record<string, string> = {
  abia: '07059951536',
  adamawa: '08065604764',
  // Akwa Ibom — all common spellings/abbreviations
  'akwa ibom': '08033380470',
  'akwaibom': '08033380470',
  'a/ibom': '08033380470',
  anambra: '08039334002',
  bauchi: '08034844393',
  bayelsa: '07032702984',
  benue: '08032845555',
  borno: '09025437854',
  // Cross River — all common spellings/abbreviations
  'cross river': '08068559326',
  'cross rivers': '08068559326',
  'c/rivers': '08068559326',
  'c/river': '08068559326',
  delta: '08131070122',
  ebonyi: '08032716251',
  edo: '08033726625',
  ekiti: '09064050086',
  enugu: '08063722988',
  gombe: '08068508998',
  imo: '08148024755',
  jigawa: '08109881890',
  kaduna: '08166405566',
  kano: '08037742748',
  katsina: '08133233534',
  kebbi: '08065159812',
  kogi: '08107899269',
  kwara: '07032108353',
  lagos: '07062606717',
  nasarawa: '08037461715',
  niger: '08032233454',
  ogun: '09159578888',
  ondo: '08067669945',
  osun: '08067788119',
  oyo: '08068122698',
  plateau: '08060545670',
  rivers: '08036219523',
  sokoto: '08032861946',
  // Taraba has two PRO lines
  taraba: '08036562695, 08080025992',
  yobe: '08065682446',
  zamfara: '07046444093',
  fct: '07038979348',
  abuja: '07038979348',
};

const mkEntry = (police: string) => ({ police, ambulance: '112', fire: '112' });

const EMERGENCY_BY_STATE: Record<string, { police: string; ambulance: string; fire: string }> = {
  ...Object.fromEntries(Object.entries(POLICE_PRO).map(([k, v]) => [k, mkEntry(v)])),
  // Expo-location long-form state names
  'akwa ibom state': mkEntry('08033380470'),
  'cross river state': mkEntry('08068559326'),
  'cross rivers state': mkEntry('08068559326'),
  'federal capital territory': mkEntry('07038979348'),
  default: { police: '112', ambulance: '112', fire: '112' },
};

const EMERGENCY_BY_CITY: Record<string, { police: string; ambulance: string; fire: string }> = {
  'Ikeja': mkEntry('07062606717'),
  'Victoria Island': mkEntry('07062606717'),
  'Lekki': mkEntry('07062606717'),
  'Port Harcourt': mkEntry('08036219523'),
  'Abuja': mkEntry('07038979348'),
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
   * 3. IP-based location fallback (used when GPS is denied or returns Unknown)
   * ipapi.co returns: { city, region, country_code }
   * region = "Rivers", "Lagos", "Federal Capital Territory", etc.
   */
  getLocationFromIP: async (): Promise<{ city: string; state: string }> => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data.country_code !== 'NG') return { city: '', state: '' };
      return { city: data.city || '', state: data.region || '' };
    } catch {
      return { city: '', state: '' };
    }
  },

  /**
   * 4. Get Emergency Numbers — normalises the input before matching so
   *    "Rivers State", "rivers", "RIVERS" all resolve correctly.
   */
  getEmergencyNumbers: (locationString: string) => {
    const normalized = String(locationString || '')
      .toLowerCase()
      .replace(/\s*state$/i, '')      // "Rivers State" → "rivers"
      .replace(/\s*\(fct\)/i, '')     // "Abuja (FCT)"  → "abuja"
      .trim();

    const cityMatch = Object.entries(EMERGENCY_BY_CITY).find(([city]) =>
      normalized.includes(city.toLowerCase())
    );
    if (cityMatch) return cityMatch[1];

    const exactMatch = EMERGENCY_BY_STATE[normalized];
    if (exactMatch) return exactMatch;

    const partialMatch = Object.entries(EMERGENCY_BY_STATE).find(([state]) =>
      state !== 'default' && normalized.includes(state)
    );
    if (partialMatch) return partialMatch[1];

    return EMERGENCY_BY_STATE.default;
  },

  getEmergencyNumbersFromParts: (city: string, state: string) => {
    const normalize = (s: string) =>
      s.toLowerCase().replace(/\s*state$/i, '').replace(/\s*\(fct\)/i, '').trim();

    const byCity = EMERGENCY_BY_CITY[city];
    if (byCity) return byCity;

    const normState = normalize(state);
    const byExact = EMERGENCY_BY_STATE[normState];
    if (byExact) return byExact;

    const byPartial = Object.entries(EMERGENCY_BY_STATE).find(([key]) =>
      key !== 'default' && normState.includes(key)
    );
    if (byPartial) return byPartial[1];

    return EMERGENCY_BY_STATE.default;
  },
};
