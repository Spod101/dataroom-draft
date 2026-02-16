"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { 
  createSession, 
  updateSessionActivity, 
  getDeviceInfo, 
  shouldUpdateActivity,
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

  const lastActivityUpdate = React.useRef<number>(0);

  const fetchProfile = React.useCallback(async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("id", userId)
      .single();
    if (error || !data) return null;
    return data as UserProfile;
  }, []);

  const fetchSessions = React.useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("expires_at", new Date().toISOString())
      .order("last_activity", { ascending: false });

    if (error || !data) return [];
    return data as UserSession[];
  }, []);

  const updateActivity = React.useCallback(async (sessionId: string) => {
    if (shouldUpdateActivity(lastActivityUpdate.current)) {
      await updateSessionActivity(sessionId);
      lastActivityUpdate.current = Date.now();
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;
    let initDone = false;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (!session?.user) {
          initDone = true;
          setState({ user: null, profile: null, loading: false, currentSession: null, sessions: [] });
          return;
        }

        const profile = await fetchProfile(session.user.id);
        const sessions = await fetchSessions(session.user.id);
        if (!mounted) return;

        const deviceInfo = getDeviceInfo();
        const existingSession = sessions.find(s => s.device_info === deviceInfo);
        initDone = true;
        setState({
          user: { id: session.user.id, email: session.user.email ?? "" },
          profile,
          loading: false,
          currentSession: existingSession || null,
          sessions,
        });
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted && !initDone) {
          initDone = true;
          setState({ user: null, profile: null, loading: false, currentSession: null, sessions: [] });
        }
      }
    };

    init();

    // Reduced timeout from 10s to 5s for faster fallback
    const timeout = setTimeout(() => {
      if (mounted && !initDone) {
        console.warn('Auth initialization timeout');
        initDone = true;
        setState((prev) => (prev.loading ? { ...prev, loading: false } : prev));
      }
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (!session?.user) {
        setState({ user: null, profile: null, loading: false, currentSession: null, sessions: [] });
        return;
      }

      const profile = await fetchProfile(session.user.id);
      const sessions = await fetchSessions(session.user.id);

      // Only create session on actual sign in event
      let currentSession = null;
      if (event === 'SIGNED_IN') {
        const deviceInfo = getDeviceInfo();
        currentSession = await createSession(session.user.id, deviceInfo);
      } else {
        // Find existing session for this device
        const deviceInfo = getDeviceInfo();
        currentSession = sessions.find(s => s.device_info === deviceInfo) || null;
      }

      if (!mounted) return;
      setState({
        user: { id: session.user.id, email: session.user.email ?? "" },
        profile,
        loading: false,
        currentSession,
        sessions,
      });
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchSessions]);

  // Track activity
  React.useEffect(() => {
    if (!state.currentSession) return;

    const handleActivity = () => {
      updateActivity(state.currentSession!.id);
    };

    // Update activity on user interactions
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [state.currentSession, updateActivity]);

  const refreshSessions = React.useCallback(async () => {
    if (!state.user) return;
    const sessions = await fetchSessions(state.user.id);
    setState(prev => ({ ...prev, sessions }));
  }, [state.user, fetchSessions]);

  const signOut = React.useCallback(async () => {
    if (state.currentSession) {
      await supabase
        .from("user_sessions")
        .delete()
        .eq("id", state.currentSession.id);
    }
    await supabase.auth.signOut();
    setState({ user: null, profile: null, loading: false, currentSession: null, sessions: [] });
  }, [state.currentSession]);

  const signOutAllDevices = React.useCallback(async () => {
    if (!state.user) return;
    await revokeAllUserSessions(state.user.id);
    await supabase.auth.signOut();
    setState({ user: null, profile: null, loading: false, currentSession: null, sessions: [] });
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
