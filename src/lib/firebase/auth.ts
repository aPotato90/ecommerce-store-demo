import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";

import { getFirebaseServices } from "./client";

/**
 * Resolves the current Firebase user, signing in anonymously if there is none.
 * Call this only when a visitor needs an identity (checkout, orders), never on page load.
 */
export async function ensureAnonymousUser(): Promise<User> {
  const { auth } = getFirebaseServices();
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export function watchAuthState(callback: (user: User | null) => void): () => void {
  const { auth } = getFirebaseServices();
  return onAuthStateChanged(auth, callback);
}
