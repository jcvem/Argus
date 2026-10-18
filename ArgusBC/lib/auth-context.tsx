"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  getFirebaseAuth,
  getGoogleProvider,
  isFirebaseConfigured,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  User,
} from "./firebase";
import { orgService } from "./org-service";

export interface DemoUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  isDemo: true;
}

export type AuthUser = (User & { isDemo?: false }) | DemoUser;

export interface AuthContextType {
  loading: boolean;
  user: AuthUser | null;
  authConfigured: boolean;
  isDemoSession: boolean;
  error: string | null;
  clearError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: DemoUser = {
  uid: "user-admin-jc",
  email: "jc@vem-studio.com",
  displayName: "JC (Lead Admin)",
  isDemo: true,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = typeof window !== "undefined" ? isFirebaseConfigured() : false;
  const [user, setUser] = useState<AuthUser | null>(() => {
    return isFirebaseConfigured() ? null : DEMO_USER;
  });
  const [loading, setLoading] = useState<boolean>(() => isFirebaseConfigured());
  const [authConfigured, setAuthConfigured] = useState<boolean>(() => isFirebaseConfigured());
  const [isDemoSession, setIsDemoSession] = useState<boolean>(() => !isFirebaseConfigured());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isConfig = isFirebaseConfigured();
    setAuthConfigured(isConfig);

    if (!isConfig) {
      const explicitlySignedOut =
        typeof window !== "undefined" && sessionStorage.getItem("argus_signed_out") === "1";
      if (explicitlySignedOut) {
        setUser(null);
        setIsDemoSession(false);
      } else {
        setUser(DEMO_USER);
        setIsDemoSession(true);
      }
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsDemoSession(false);
      } else {
        const isDemo = typeof window !== "undefined" && sessionStorage.getItem("argus_demo_mode") === "1";
        if (isDemo) {
          setUser(DEMO_USER);
          setIsDemoSession(true);
        } else {
          setUser(null);
          setIsDemoSession(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const clearError = () => setError(null);

  const enterDemoMode = () => {
    setError(null);
    setUser(DEMO_USER);
    setIsDemoSession(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("argus_demo_mode", "1");
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    setError(null);
    const auth = getFirebaseAuth();
    if (!authConfigured || !auth) {
      const msg =
        "Firebase is not configured. Provide NEXT_PUBLIC_FIREBASE_* environment variables in .env.local to enable live Google Sign-In, or use Demo Shell.";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setLoading(true);
      await signInWithPopup(auth, getGoogleProvider());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google authentication failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string): Promise<void> => {
    setError(null);
    const auth = getFirebaseAuth();
    if (!authConfigured || !auth) {
      const msg =
        "Firebase is not configured. Provide NEXT_PUBLIC_FIREBASE_* environment variables in .env.local to enable live Email Sign-In, or use Demo Shell.";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Email sign-in failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string): Promise<void> => {
    setError(null);
    const auth = getFirebaseAuth();
    if (!authConfigured || !auth) {
      const msg =
        "Firebase is not configured. Provide NEXT_PUBLIC_FIREBASE_* environment variables in .env.local to enable live registration, or use Demo Shell.";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Account registration failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setError(null);
    if (isDemoSession) {
      setUser(null);
      setIsDemoSession(false);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("argus_demo_mode");
      }
      return;
    }

    const auth = getFirebaseAuth();
    if (auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        user,
        authConfigured,
        isDemoSession,
        error,
        clearError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        enterDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Client-side route guard.
 *
 * NOTE ON SECURITY BOUNDARIES:
 * Client-only route gating improves UX by directing unauthenticated users to /signin.
 * However, client-side route gating is NOT a security boundary. True security and
 * data isolation are enforced at the RedactCore API and Cerberus gateway levels.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== "/signin") {
      router.replace("/signin");
      return;
    }

    if (!loading && user) {
      if (pathname === "/onboarding" || pathname === "/invite" || pathname === "/signin") {
        return;
      }
      const userOrgs = orgService.getUserOrganizations(user.uid, user.email || undefined);
      if (userOrgs.length === 0) {
        router.replace("/onboarding");
      }
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-argus-paper dark:bg-argus-dark-bg flex items-center justify-center p-6 text-argus-ink dark:text-argus-dark-text">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-argus-border dark:border-argus-dark-border border-t-argus-accent animate-spin rounded-none" />
          <span className="font-mono text-xs uppercase tracking-widest text-argus-ink-muted dark:text-argus-dark-muted">
            ARGUS // VERIFYING CONTROL-PLANE CREDENTIALS…
          </span>
        </div>
      </div>
    );
  }

  if (!user && pathname !== "/signin") {
    return null;
  }

  return <>{children}</>;
}
