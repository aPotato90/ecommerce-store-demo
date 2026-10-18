import type { FirebaseOptions } from "firebase/app";

/** Local emulators (npm run emulators) instead of a real Firebase project. */
export const useFirebaseEmulators =
  process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true";

export const EMULATOR_PROJECT_ID = "demo-kestrel";

// Each variable is referenced literally so Next.js can inline it into the client bundle.
const env = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfig: FirebaseOptions = useFirebaseEmulators
  ? {
      // The emulators accept any API key; "demo-*" project ids never touch real services.
      apiKey: env.apiKey || "demo-api-key",
      authDomain: env.authDomain || `${EMULATOR_PROJECT_ID}.firebaseapp.com`,
      projectId: env.projectId || EMULATOR_PROJECT_ID,
      appId: env.appId || "1:000000000000:web:demo",
    }
  : env;

/** True when enough configuration is present to talk to Firebase (or its emulators). */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);
