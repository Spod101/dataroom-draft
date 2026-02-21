"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { 
  createSession, 
  getUserSessions,
  getDeviceInfo, 
  revokeSession,
  revokeAllUserSessions,
  type UserSession 
} from "@/lib/session-utils";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AuthState = {
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  currentSession: UserSession | null;
  sessions: UserSession[];
};

type AuthContextValue = AuthState & {
  signOut: () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
  refreshSessions: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

// Debounce session operations to prevent rapid re-initialization
const SESSION_DEBOUNCE_MS = 500;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    currentSession: null,
    sessions: [],
  });

  // Track initialization to prevent duplicate session creation
  const initializingRef = React.useRef(false);
  const lastInitUserIdRef = React.useRef<string | null>(null);
  const initDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Safety: force loading=false after 8s to avoid infinite spinner
    const AUTH_INIT_TIMEOUT_MS = 8_000;
    timeoutId = setTimeout(() => {
      if (cancelled) return;
      setState((prev) => {
        if (!prev.loading) return prev;
        console.warn('[Auth] Init timeout reached, forcing loading=false');
        return { user: null, profile: null, loading: false, currentSession: null, sessions: [] };
      });
    }, AUTH_INIT_TIMEOUT_MS);

    // Get user profile from database
    async function fetchProfile(userId: string): Promise<UserProfile | null> {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, name, email, role")
          .eq("id", userId)
          .single();
        
        if (error) {
          console.error('[Auth] Failed to fetch profile:', error);
          return null;
        }
        
        return data as UserProfile;
      } catch (err) {
        console.error('[Auth] Profile fetch error:', err);
        return null;
      }
    }

    // Load user data and session - deduped by userId
    async function loadUserData(userId: string, email: string) {
      // Skip if already initializing for this user or recently completed
      if (initializingRef.current && lastInitUserIdRef.current === userId) {
        return;
      }

      // Debounce rapid calls (e.g., from both getSession and onAuthStateChange)
      if (initDebounceRef.current) {
        clearTimeout(initDebounceRef.current);
      }

      return new Promise<void>((resolve) => {
        initDebounceRef.current = setTimeout(async () => {
          if (cancelled || (initializingRef.current && lastInitUserIdRef.current === userId)) {
            resolve();
            return;
          }

          initializingRef.current = true;
          lastInitUserIdRef.current = userId;

          try {
            // Load profile first (faster operation)
            const profile = await fetchProfile(userId);
            
            if (cancelled) {
              initializingRef.current = false;
              resolve();
              return;
            }

            // Set initial state with user info immediately to reduce perceived loading
            setState(prev => ({
              ...prev,
              user: { id: userId, email },
              profile,
              loading: prev.currentSession === null, // Keep loading until we have session
            }));

            // Create or get session and fetch all sessions
            const deviceInfo = getDeviceInfo();
            const [userSession, allSessions] = await Promise.all([
              createSession(userId, deviceInfo).catch(() => null),
              getUserSessions(userId).catch(() => []),
            ]);

            if (cancelled) {
              initializingRef.current = false;
              resolve();
              return;
            }

            setState({
              user: { id: userId, email },
              profile,
              loading: false,
              currentSession: userSession,
              sessions: allSessions,
            });
          } catch (error: any) {
            const errorMessage = error?.message ?? "";
            const errorName = error?.name ?? "";
            
            // Ignore abort/cancellation errors
            if (
              errorName === "AbortError" ||
              errorMessage.includes("signal is aborted") ||
              errorMessage.includes("AbortError")
            ) {
              initializingRef.current = false;
              resolve();
              return;
            }
            
            console.error('[Auth] User data load error:', error);
            
            if (!cancelled) {
              // Still set user as logged in even if session creation failed
              setState(prev => ({
                user: prev.user ?? { id: userId, email },
                profile: prev.profile,
                loading: false,
                currentSession: null,
                sessions: [],
              }));
            }
          } finally {
            initializingRef.current = false;
          }
          
          resolve();
        }, SESSION_DEBOUNCE_MS);
      });
    }

    // Initialize auth state - runs once on mount
    async function initAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] getSession error:', error);
        }
        
        if (cancelled) return;
        
        if (!session?.user) {
          setState({ user: null, profile: null, loading: false, currentSession: null, sessions: [] });
          return;
        }

        await loadUserData(session.user.id, session.user.email ?? "");
      } catch (error) {
        console.error('[Auth] Init error:', error);
        if (!cancelled) {
          setState({ user: null, profile: null, loading: false, currentSession: null, sessions: [] });
        }
      }
    }

    // Listen for auth changes - handles sign in/out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      // Handle sign out
      if (event === 'SIGNED_OUT' || !session) {
        lastInitUserIdRef.current = null;
        initializingRef.current = false;
        if (initDebounceRef.current) {
          clearTimeout(initDebounceRef.current);
          initDebounceRef.current = null;
        }
        setState({ user: null, profile: null, loading: false, currentSession: null, sessions: [] });
        return;
      }

      // Handle new sign in (not initial session load)
      if (event === 'SIGNED_IN' && session.user) {
        await loadUserData(session.user.id, session.user.email ?? "");
        return;
      }

      // Handle token refresh - update user state if needed but don't reload everything
      if (event === 'TOKEN_REFRESHED' && session.user) {
        setState(prev => {
          if (prev.user?.id === session.user.id) return prev;
          return {
            ...prev,
            user: { id: session.user.id, email: session.user.email ?? "" },
          };
        });
      }
    });

    initAuth();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (initDebounceRef.current) clearTimeout(initDebounceRef.current);
      subscription.unsubscribe();
    };
  }, []);

  const refreshSessions = React.useCallback(async () => {
    if (!state.user) return;
    const allSessions = await getUserSessions(state.user.id);
    setState(prev => ({ ...prev, sessions: allSessions }));
  }, [state.user]);

  const signOut = React.useCallback(async () => {
    if (state.currentSession) {
      await revokeSession(state.currentSession.id);
    }
    await supabase.auth.signOut();
  }, [state.currentSession]);

  const signOutAllDevices = React.useCallback(async () => {
    if (!state.user) return;
    await revokeAllUserSessions(state.user.id);
    await supabase.auth.signOut();
  }, [state.user]);

  const value: AuthContextValue = {
    ...state,
    signOut,
    signOutAllDevices,
    refreshSessions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
