import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * Returns true only if all essential Firebase client configuration
 * environment variables are present and not equal to empty or placeholder values.
 */
export function isFirebaseConfigured(): boolean {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !projectId || !appId) {
    return false;
  }

  // Reject placeholder values from .env.example
  const isPlaceholder =
    apiKey.includes("your-api-key") ||
    projectId.includes("your-project-id") ||
    appId.includes("000000000000");

  return !isPlaceholder;
}

export function getFirebaseConfig(): FirebaseClientConfig | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;

export function getFirebaseFirestore(): Firestore | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!firestoreInstance && isFirebaseConfigured()) {
    const config = getFirebaseConfig();
    if (config) {
      try {
        appInstance = getApps().length > 0 ? getApp() : initializeApp(config);
        firestoreInstance = getFirestore(appInstance);
      } catch (err) {
        console.warn("[Argus Datastore] Firestore initialization deferred:", err);
      }
    }
  }

  return firestoreInstance;
}

export function getFirebaseAuth(): Auth | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!authInstance && isFirebaseConfigured()) {
    const config = getFirebaseConfig();
    if (config) {
      try {
        appInstance = getApps().length > 0 ? getApp() : initializeApp(config);
        authInstance = getAuth(appInstance);
      } catch (err) {
        console.warn("[Argus Auth] Firebase initialization deferred:", err);
      }
    }
  }

  return authInstance;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProviderInstance) {
    googleProviderInstance = new GoogleAuthProvider();
  }
  return googleProviderInstance;
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  type User,
};
