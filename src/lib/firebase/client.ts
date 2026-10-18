import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

import { firebaseConfig, isFirebaseConfigured, useFirebaseEmulators } from "./config";

// Survives hot reloads in development, so emulators are only connected once.
const globalForFirebase = globalThis as typeof globalThis & {
  __kestrelFirebaseEmulatorsConnected?: boolean;
};

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* variables.");
    this.name = "FirebaseNotConfiguredError";
  }
}

/** Returns the single Firebase app, initialising it on first use (never twice). */
export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) throw new FirebaseNotConfiguredError();
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

function connectEmulatorsOnce(auth: Auth, db: Firestore) {
  if (!useFirebaseEmulators || globalForFirebase.__kestrelFirebaseEmulatorsConnected)
    return;
  globalForFirebase.__kestrelFirebaseEmulatorsConnected = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export function getFirebaseServices(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  connectEmulatorsOnce(auth, db);
  return { app, auth, db };
}
