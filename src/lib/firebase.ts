
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

// Only initialize Firebase if the API key is present.
// This is crucial for build processes where env vars might not be immediately available.
if (firebaseConfig.apiKey) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  if (app) {
    db = getFirestore(app);
    auth = getAuth(app);

    if (typeof window !== 'undefined') {
      isAnalyticsSupported().then((supported) => {
        if (supported && app) {
          analytics = getAnalytics(app);
          // console.log("Firebase Analytics initialized.");
        } else {
          // console.log("Firebase Analytics is not supported in this environment or app not initialized.");
        }
      }).catch(error => {
        console.error("Error checking Firebase Analytics support:", error);
      });
    }
  }
} else {
  // This warning will appear during the Vercel build if the API key is missing.
  console.warn(
    'Firebase API key is missing. Firebase services will not be initialized. ' +
    'Ensure NEXT_PUBLIC_FIREBASE_API_KEY (and other Firebase env vars) are correctly set in your Vercel project settings.'
  );
}

export { app, db, auth, analytics };
