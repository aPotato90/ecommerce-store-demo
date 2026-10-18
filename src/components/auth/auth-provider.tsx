"use client";

import type { User } from "firebase/auth";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { isFirebaseConfigured } from "@/lib/firebase/config";

type AuthStatus = "idle" | "loading" | "signed-in" | "error" | "unconfigured";

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  /**
   * Signs the visitor in anonymously if needed. Call it from pages that need an identity
   * (checkout, orders); nothing Firebase-related loads until then.
   */
  ensureSignedIn: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    isFirebaseConfigured ? "idle" : "unconfigured",
  );
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Promise<User | null> | null>(null);

  const ensureSignedIn = useCallback(async () => {
    if (!isFirebaseConfigured) return null;
    if (pending.current) return pending.current;

    pending.current = (async () => {
      setStatus("loading");
      setError(null);
      try {
        // Loaded on demand so the Firebase SDK stays out of the initial page bundle.
        const { ensureAnonymousUser, watchAuthState } =
          await import("@/lib/firebase/auth");
        const signedIn = await ensureAnonymousUser();
        setUser(signedIn);
        setStatus("signed-in");
        watchAuthState((next) => {
          setUser(next);
          setStatus(next ? "signed-in" : "idle");
          if (!next) pending.current = null;
        });
        return signedIn;
      } catch (cause) {
        pending.current = null;
        setStatus("error");
        setError(
          cause instanceof Error ? cause.message : "Could not start a guest session.",
        );
        return null;
      }
    })();

    return pending.current;
  }, []);

  const value = useMemo(
    () => ({ user, status, error, ensureSignedIn }),
    [user, status, error, ensureSignedIn],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
