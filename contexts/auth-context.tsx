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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    currentSession: null,
    sessions: [],
  });

  React.useEffect(() => {
    let mounted = true;

    // Get user profile from database
    async function fetchProfile(userId: string): Promise<UserProfile | null> {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role")
        .eq("id", userId)
        .single();
      
      if (error) {
        console.error('Failed to fetch profile:', error);
        return null;
      }
      
      return data as UserProfile;
    }

    // Initialize auth state
    async function initAuth() {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (!session?.user) {
          setState({ user: null, profile: null, loading: false, currentSession: null, sessions: [] });
          return;
        }

        // Load user profile
        const profile = await fetchProfile(session.user.id);
        
        if (!mounted) return;

        // Create or get session
        const deviceInfo = getDeviceInfo();
        const userSession = await createSession(session.user.id, deviceInfo);
        
        // Get all user sessions
        const allSessions = await getUserSessions(session.user.id);

        setState({
          user: { id: session.user.id, email: session.user.email ?? "" },
          profile,
          loading: false,
          currentSession: userSession,
          sessions: allSessions,
        });
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setState({ user: null, profile: null, loading: false, currentSession: null, sessions: [] });
        }
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setState({ user: null, profile: null, loading: false, currentSession: null, sessions: [] });
        return;
      }

      if (event === 'SIGNED_IN' && session.user) {
        const profile = await fetchProfile(session.user.id);
        const deviceInfo = getDeviceInfo();
        const userSession = await createSession(session.user.id, deviceInfo);
        const allSessions = await getUserSessions(session.user.id);

        if (mounted) {
          setState({
            user: { id: session.user.id, email: session.user.email ?? "" },
            profile,
            loading: false,
            currentSession: userSession,
            sessions: allSessions,
          });
        }
      }
    });

    initAuth();

    return () => {
      mounted = false;
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
