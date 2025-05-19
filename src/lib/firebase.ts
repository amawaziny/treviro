
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics';
// Crashlytics import removed

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

let analytics: Analytics | null = null;
// crashlytics variable removed

if (typeof window !== 'undefined') { // Check if running in browser
  isAnalyticsSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized.");
    } else {
      console.log("Firebase Analytics is not supported in this environment.");
    }
  }).catch(error => {
    console.error("Error checking Firebase Analytics support:", error);
  });

  // Crashlytics initialization block removed
}

export { app, db, auth, analytics }; // crashlytics removed from export
