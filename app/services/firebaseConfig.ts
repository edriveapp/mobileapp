// Import from @firebase/* directly to ensure the auth RN bundle
// and the app module use the same singleton instance.
import { getApp, getApps, initializeApp } from '@firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase Web Config
const firebaseConfig = {
  apiKey: "AIzaSyDNJmzGcTCJoBNnLOsocTKNNwoG1gVonGU",
  authDomain: "edrive-765ed.firebaseapp.com",
  projectId: "edrive-765ed",
  storageBucket: "edrive-765ed.firebasestorage.app",
  messagingSenderId: "831560072030",
  appId: "1:831560072030:web:9ebcd9f94bd8fbf8e66dcf"
};

// Initialize Firebase App using @firebase/app (same module the auth bundle uses internally)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// getAuth is safe now because @firebase/app is the same instance auth uses
const firebaseAuth = getAuth(app);

export { firebaseAuth };
export default firebaseAuth;