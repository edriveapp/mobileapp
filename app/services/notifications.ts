import Constants from 'expo-constants';
import * as Device from 'expo-device';
// Use type import ONLY so the module isn't evaluated at the top level
import type * as NotificationsType from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';

export type NotificationSoundType = 'default' | 'message' | 'booking' | 'request';

// Check if running in Expo Go (appOwnership is 'expo' in Expo Go)
const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

// Conditionally require the actual module so Android Expo Go doesn't crash on import in SDK 53+
let Notifications: typeof NotificationsType | null = null;
if (!isExpoGo || Platform.OS === 'ios') {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    console.warn('Could not load expo-notifications', e);
  }
}

// ---------------------------------------------------------------------------
// Sound configuration
// Place ding.wav and booking.wav in /android/app/src/main/res/raw/
// and in iOS project (via Xcode) for native custom sounds.
// Expo will pick them up by filename (no extension needed for Android, .wav for iOS).
// ---------------------------------------------------------------------------
const SOUND_MAP: Record<NotificationSoundType, string> = {
  default: 'default',
  message: Platform.OS === 'android' ? 'ding' : 'ding.wav',
  booking: Platform.OS === 'android' ? 'booking' : 'booking.wav',
  request: Platform.OS === 'android' ? 'booking' : 'booking.wav',
};

// Channel IDs used when scheduling notifications
export const CHANNEL_IDS: Record<NotificationSoundType, string> = {
  message: 'Messages',
  booking: 'Bookings & Ride Alerts',
  request: 'Bookings & Ride Alerts',
  default: 'General',
};

export const setupNotificationChannels = async () => {
  if (Platform.OS !== 'android' || isExpoGo || !Notifications) return;
  
  // Define channels inside the function so `Notifications.AndroidImportance` 
  // isn't evaluated at the top-level during import, which crashes Expo Go SDK 53+.
  const CHANNELS: NotificationsType.NotificationChannelInput[] = [
    {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      sound: SOUND_MAP.message,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22C55E',
    },
    {
      name: 'Bookings & Ride Alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: SOUND_MAP.booking,
      vibrationPattern: [0, 300, 100, 300],
      lightColor: '#005124',
    },
    {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    },
  ];

  try {
    for (const channel of CHANNELS) {
      await Notifications.setNotificationChannelAsync(channel.name, channel);
    }
  } catch (error) {
    console.warn('Failed to setup notification channels:', error);
  }
};

// Foreground notification behaviour: always show banner with sound
if (!isExpoGo || Platform.OS === 'ios') {
  try {
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.warn('Failed to set notification handler:', error);
  }
}

const getExpoProjectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId ||
  Constants.easConfig?.projectId ||
  undefined;

export const registerForPushNotificationsAsync = async () => {
  if (isExpoGo || !Notifications) {
    console.log('Push notifications (remote) are not supported in Expo Go on Android SDK 53+. Use a development build.');
    return null;
  }

  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices.');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission denied.');
      return null;
    }

    // Set up Android channels after permissions granted
    await setupNotificationChannels();

    const projectId = getExpoProjectId();
   if (!projectId) {
  throw new Error('Missing Expo projectId');
  
}


  const token = await Notifications.getExpoPushTokenAsync({
  projectId: projectId!,
});
    return token.data;
  } catch (err) {
    console.warn('Could not get push token:', err);
    return null;
  }
};

export const syncPushToken = async () => {
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) return null;

    await api.post('/users/push-token', { token });
    return token;
  }catch (error) {
  if (error instanceof Error) {
    console.warn('Push registration failed', error.message);
  } else {
    console.warn('Push registration failed', error);
  }
}
};

export const presentLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>,
  soundType: NotificationSoundType = 'default',
) => {
  if (!Notifications) return;
  try {
    const channelId = CHANNEL_IDS[soundType];
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: SOUND_MAP[soundType],
      },
      trigger: null,
      ...(Platform.OS === 'android' ? { channelId } : {}),
    } as any);
  } catch (error) {
    console.warn('Local notification failed', error);
  }
};

export const addNotificationResponseListener = (
  callback: (response: NotificationsType.NotificationResponse) => void,
) => {
  if (!Notifications || (isExpoGo && Platform.OS === 'android')) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(callback);
};

export const addNotificationReceivedListener = (
  callback: (notification: NotificationsType.Notification) => void,
) => {
  if (!Notifications || (isExpoGo && Platform.OS === 'android')) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(callback);
};
