import { Linking, Alert, Platform } from 'react-native';

/**
 * Safely opens a URL by checking if it's supported and catching potential errors.
 * Useful for 'tel:', 'mailto:', and other custom schemes.
 * 
 * @param url The URL to open (e.g., 'tel:+2347045104464')
 * @param errorMessage User-friendly message to show if opening fails
 */
export const safeOpenURL = async (url: string, errorMessage?: string) => {
  try {
    let finalUrl = url;
    if (url.startsWith('tel:')) {
      const parts = url.split(':');
      if (parts.length > 1) {
        // Keep the prefix, sanitize the number
        const number = parts[1].replace(/[^\d+]/g, '');
        finalUrl = `tel:${number}`;
      }
    }

    const supported = await Linking.canOpenURL(finalUrl);
    
    if (!supported) {
      Alert.alert(
        'Action unavailable', 
        errorMessage || 'This device does not support this action (e.g., phone calls or email).'
      );
      return;
    }

    await Linking.openURL(finalUrl);

  } catch (error) {
    console.error(`[safeOpenURL] Error opening URL: ${url}`, error);
    Alert.alert(
      'Error', 
      errorMessage || 'An error occurred while trying to open this link.'
    );
  }
};
