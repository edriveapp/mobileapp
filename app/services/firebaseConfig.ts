// Import from @firebase/* directly to ensure the auth RN bundle
// and the app module use the same singleton instance.
import { getApp, getApps, initializeApp } from '@firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';

// Firebase Web Config
const firebaseConfig = {
  apiKey: "AIzaSyDNJmzGcTCJoBNnLOsocTKNNwoG1gVonGU",
  authDomain: "edrive-765ed.firebaseapp.com",
  projectId: "edrive-765ed",
  storageBucket: "edrive-765ed.firebasestorage.app",
  messagingSenderId: "831560072030",
  appId: "1:831560072030:web:9ebcd9f94bd8fbf8e66dcf"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with ReactNative persistence
// Fast Refresh/HMR can cause this module to be re-evaluated, crashing on `initializeAuth`.
// We have to check if the Auth instance exists or try/catch it.
let firebaseAuth;
try {
  // Attempt to initialize Auth with AsyncStorage.
  // This will throw if auth is already initialized for this app instance.
  firebaseAuth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error: any) {
  // If already initialized (e.g. during Hot Module Replacement), just retrieve it
  if (error.code === 'auth/already-initialized') {
    firebaseAuth = getAuth(app);
  } else {
    throw error;
  }
}

export { firebaseAuth };
export default firebaseAuth;