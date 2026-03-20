import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import api from './api';

export type NotificationSoundType = 'default' | 'message' | 'booking' | 'request';

const SOUND_MAP: Record<NotificationSoundType, string | undefined> = {
  default: 'default',
  message: 'default',
  booking: 'default',
  request: 'default',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const getExpoProjectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId ||
  Constants.easConfig?.projectId ||
  undefined;

export const registerForPushNotificationsAsync = async () => {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    console.warn('Missing Expo projectId for push notifications.');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
};

export const syncPushToken = async () => {
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) return null;

    await api.post('/users/push-token', { token });
    return token;
  } catch (error) {
    console.warn('Push registration failed', error);
    return null;
  }
};

export const presentLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>,
  soundType: NotificationSoundType = 'default',
) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: SOUND_MAP[soundType],
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('Local notification failed', error);
  }
};

export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void,
) => Notifications.addNotificationResponseReceivedListener(callback);
