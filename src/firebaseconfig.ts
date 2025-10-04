// src/firebaseConfig.ts

// Import Firebase v9+ modular SDK
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Firebase configuration object
// These values are from your Firebase project console
const firebaseConfig = {
  apiKey: "AIzaSyAKmAHeSqw6hX3Bvdi2cbGwCvprroObTK4",
  authDomain: "jaguarwebsolutions-42b13.firebaseapp.com",
  projectId: "jaguarwebsolutions-42b13",
  storageBucket: "jaguarwebsolutions-42b13.firebasestorage.app",
  messagingSenderId: "307062943289",
  appId: "1:307062943289:web:f314717ffaa37ce7f8e7e8",
  measurementId: "G-938MEPBEW8"
};

// Initialize Firebase app
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

// Initialize Analytics (optional - only works in browser)
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Export initialized services for use throughout your app
export { app, auth, db, analytics };
