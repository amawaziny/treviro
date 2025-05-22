
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let analytics: Analytics | null = null;

// Only initialize Firebase if the API key is present and a non-empty string.
if (firebaseConfig.apiKey && typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.trim() !== '') {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (e) {
      console.error("Firebase initialization error:", e);
      // app will remain null
    }
  } else {
    app = getApp();
  }

  if (app) {
    try {
      db = getFirestore(app);
      auth = getAuth(app);

      if (typeof window !== 'undefined') {
        isAnalyticsSupported().then((supported) => {
          if (supported && app) { // ensure app is still valid
            try {
              analytics = getAnalytics(app);
              // console.log("Firebase Analytics initialized.");
            } catch (e) {
              console.error("Firebase Analytics initialization error:", e);
              // analytics will remain null
            }
          } else {
            // console.log("Firebase Analytics is not supported in this environment or app not initialized.");
          }
        }).catch(error => {
          console.error("Error checking Firebase Analytics support:", error);
        });
      }
    } catch (e) {
      console.error("Error initializing Firestore/Auth:", e);
      // db and auth might remain null or partially initialized
    }
  }
} else {
  console.warn(
    'Firebase API key is missing or invalid. Firebase services will not be initialized. ' +
    'Ensure NEXT_PUBLIC_FIREBASE_API_KEY (and other Firebase env vars) are correctly set.'
  );
}

export { app, db, auth, analytics };
