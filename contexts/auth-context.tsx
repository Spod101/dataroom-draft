"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";

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
};

type AuthContextValue = AuthState & {
  signOut: () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
  refreshSessions: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });

  React.useEffect(() => {
    let cancelled = false;

    // Safety timeout - force loading=false after 5s
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setState((prev) => {
        if (!prev.loading) return prev;
        console.warn('[Auth] Init timeout reached, forcing loading=false');
        return { user: null, profile: null, loading: false };
      });
    }, 5_000);

    async function fetchProfile(userId: string): Promise<UserProfile | null> {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, name, email, role")
          .eq("id", userId)
          .single();
        if (error) {
          console.error('[Auth] Profile fetch error:', error);
          return null;
        }
        return data as UserProfile;
      } catch (err) {
        console.error('[Auth] Profile fetch exception:', err);
        return null;
      }
    }

    async function initAuth() {
      try {
        let { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] getSession error:', error);
        }

        // If no active session, try refreshing once — the token may be expired
        // but still refreshable (common after idle). Without this, a page reload
        // after idle incorrectly redirects to /login.
        if (!session) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData.session) {
            session = refreshData.session;
          }
        }

        if (cancelled) return;

        if (!session?.user) {
          setState({ user: null, profile: null, loading: false });
          return;
        }

        const userId = session.user.id;
        const email = session.user.email ?? "";

        // Set user immediately so loading can finish fast, profile can arrive shortly after
        const profile = await fetchProfile(userId);
        
        if (cancelled) return;

        setState({
          user: { id: userId, email },
          profile,
          loading: false,
        });
      } catch (error) {
        console.error('[Auth] Init error:', error);
        if (!cancelled) {
          setState({ user: null, profile: null, loading: false });
        }
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      if (event === 'SIGNED_OUT' || !session) {
        setState({ user: null, profile: null, loading: false });
        return;
      }

      if (event === 'SIGNED_IN' && session.user) {
        const profile = await fetchProfile(session.user.id);
        if (cancelled) return;
        setState({
          user: { id: session.user.id, email: session.user.email ?? "" },
          profile,
          loading: false,
        });
        return;
      }

      // TOKEN_REFRESHED - just keep existing state, no need to refetch
      if (event === 'TOKEN_REFRESHED' && session.user) {
        setState(prev => {
          if (prev.user?.id === session.user.id) return prev; // No change
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
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const signOutAllDevices = React.useCallback(async () => {
    await supabase.auth.signOut({ scope: 'global' });
  }, []);

  // No-op for backward compat since session management is removed
  const refreshSessions = React.useCallback(async () => {}, []);

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
