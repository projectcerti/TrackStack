import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate config
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  console.warn(`[Firebase] Missing required configuration keys: ${missingKeys.join(', ')}. Some features may not work.`);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

let analytics: any = null;
isSupported().then(supported => {
  // Only initialize analytics if supported AND we have a valid Firebase API key (starts with AIza)
  const hasValidKey = typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.startsWith('AIza');
  
  if (supported && hasValidKey) {
    try {
      analytics = getAnalytics(app);
      console.log('[Firebase] Analytics initialized.');
    } catch (err) {
      console.error('[Firebase] Analytics failed to initialize:', err);
    }
  } else {
    console.log('[Firebase] Analytics skipped: Not supported or invalid API key.');
  }
}).catch(err => {
  console.error('[Firebase] Analytics support check error:', err);
});

export { analytics };
