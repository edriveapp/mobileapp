import { Platform } from 'react-native';

const DEFAULT_VALHALLA_URL = 'https://valhalla1.openstreetmap.de';
const DEFAULT_NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const DEFAULT_PHOTON_URL = 'https://photon.komoot.io';
const USER_AGENT = 'navigatr-sdk/1.0';

type SdkNav = {
  autocomplete: (params: { query: string; limit?: number }) => Promise<any[]>;
  geocode: (params: { address: string }) => Promise<any>;
  reverseGeocode: (params: { lat: number; lng: number }) => Promise<any>;
  route: (params: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    maneuvers?: boolean;
    traffic?: boolean;
    shortest?: boolean;
  }) => Promise<any>;
  recalculateETA?: (
    currentLocation: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    options?: { traffic?: boolean }
  ) => Promise<any>;
};

let sdkNav: SdkNav | null | undefined;

const getSdkNav = (): SdkNav | null => {
  if (sdkNav !== undefined) return sdkNav ?? null;
  // `@navigatr/web` is browser-only. Never require it in native runtime.
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    sdkNav = null;
    return null;
  }
  try {
    const { Navigatr } = require('@navigatr/web');
    sdkNav = new Navigatr();
    return sdkNav ?? null;
  } catch {
    sdkNav = null;
    return null;
  }
};

const formatDuration = (seconds: number) => {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min${totalMinutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} hr${hours !== 1 ? 's' : ''}`;
  }
  return `${hours} hr${hours !== 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`;
};

const formatDistance = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const decodePolyline = (encoded: string, precision = 6) => {
  const factor = Math.pow(10, precision);
  const coordinates: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({ lat: lat / factor, lng: lng / factor });
  }

  return coordinates;
};

const fallbackAutocomplete = async (query: string, limit = 5) => {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });

  const response = await fetch(`${DEFAULT_PHOTON_URL}/api/?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Autocomplete failed: ${response.status}`);
  }

  const data = await response.json();
  return (data?.features || []).map((feature: any, index: number) => {
    const [lng, lat] = feature?.geometry?.coordinates || [0, 0];
    const props = feature?.properties || {};
    const displayName = [
      props.name,
      props.city,
      props.state,
      props.country,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      id: `${index}-${lat}-${lng}`,
      name: props.name || '',
      displayName,
      lat: Number(lat),
      lng: Number(lng),
      city: props.city,
      state: props.state,
      country: props.country,
    };
  });
};

const fallbackGeocode = async (address: string) => {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    limit: '1',
  });

  const response = await fetch(`${DEFAULT_NOMINATIM_URL}/search?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Geocode failed: ${response.status}`);
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`No results found for address: ${address}`);
  }

  return {
    lat: Number(results[0].lat),
    lng: Number(results[0].lon),
    displayName: results[0].display_name,
  };
};

const fallbackReverseGeocode = async (lat: number, lng: number) => {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
  });

  const response = await fetch(`${DEFAULT_NOMINATIM_URL}/reverse?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Reverse geocode failed: ${response.status}`);
  }

  const result = await response.json();
  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
    displayName: result.display_name,
  };
};

const fallbackRoute = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  options?: { maneuvers?: boolean; traffic?: boolean; shortest?: boolean }
) => {
  const requestBody: any = {
    locations: [
      { lon: origin.lng, lat: origin.lat, type: 'break' },
      { lon: destination.lng, lat: destination.lat, type: 'break' },
    ],
    costing: 'auto',
    directions_options: { units: 'km' },
    alternates: 3,
  };

  if (options?.traffic || options?.shortest) {
    requestBody.costing_options = {
      auto: {
        ...(options?.traffic ? { use_traffic: 1 } : {}),
        ...(options?.shortest ? { shortest: true } : {}),
      },
    };
  }

  const response = await fetch(`${DEFAULT_VALHALLA_URL}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Route failed: ${response.status}`);
  }

  const data = await response.json();
  const leg = data?.trip?.legs?.[0];
  const summary = data?.trip?.summary;

  const durationSeconds = Number(summary?.time || 0);
  const distanceMeters = Number(summary?.length || 0) * 1000;
  const polyline = decodePolyline(leg?.shape || '');

  return {
    durationSeconds,
    durationText: formatDuration(durationSeconds),
    distanceMeters,
    distanceText: formatDistance(distanceMeters),
    polyline,
  };
};

export interface NavigatrPlace {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
}

export const NavigatrService = {
  autocomplete: async (query: string, limit = 5): Promise<NavigatrPlace[]> => {
    const nav = getSdkNav();
    if (nav) {
      const results = await nav.autocomplete({ query, limit });
      return results.map((result: any, index: number) => ({
        id: `${index}-${result.lat}-${result.lng}`,
        name: result.name || '',
        displayName: result.displayName || result.name || '',
        lat: Number(result.lat),
        lng: Number(result.lng),
        city: result.city,
        state: result.state,
        country: result.country,
      }));
    }
    return fallbackAutocomplete(query, limit);
  },

  geocode: async (address: string) => {
    const nav = getSdkNav();
    if (nav) {
      return nav.geocode({ address });
    }
    return fallbackGeocode(address);
  },

  reverseGeocode: async (lat: number, lng: number) => {
    const nav = getSdkNav();
    if (nav) {
      return nav.reverseGeocode({ lat, lng });
    }
    return fallbackReverseGeocode(lat, lng);
  },

  route: async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    options?: { maneuvers?: boolean; traffic?: boolean; shortest?: boolean }
  ) => {
    const nav = getSdkNav();
    if (nav) {
      return nav.route({
        origin,
        destination,
        maneuvers: options?.maneuvers,
        traffic: options?.traffic,
        shortest: options?.shortest,
      });
    }
    return fallbackRoute(origin, destination, options);
  },

  recalculateETA: async (
    currentLocation: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) => {
    const nav = getSdkNav();
    if (nav?.recalculateETA) {
      return nav.recalculateETA(currentLocation, destination);
    }
    return fallbackRoute(currentLocation, destination);
  },
};
