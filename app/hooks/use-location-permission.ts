import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

export type LocationPermissionStatus = 'checking' | 'undetermined' | 'granted' | 'denied';

export function useLocationPermission() {
  const [status, setStatus] = useState<LocationPermissionStatus>('checking');

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status: s }) => {
      if (s === 'granted') {
        setStatus('granted');
      } else if (s === 'denied') {
        setStatus('denied');
      } else {
        setStatus('undetermined');
      }
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status: s } = await Location.requestForegroundPermissionsAsync();
    const granted = s === 'granted';
    setStatus(granted ? 'granted' : 'denied');
    return granted;
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return { status, requestPermission, openSettings };
}
