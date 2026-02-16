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

  const subscriptionRef = React.useRef<{ unsubscribe: () => void } | null>(null);

  React.useEffect(() => {
    let mounted = true;
    let initDone = false;

    const loadUserData = async (user: { id: string; email?: string }, shouldCreateSession: boolean = false) => {
      const profile = await fetchProfile(user.id);
      const sessions = await fetchSessions(user.id);
      if (!mounted) return null;

      const deviceInfo = getDeviceInfo();
      let existingSession = sessions.find(s => s.device_info === deviceInfo);
      
      // If no existing session found and we should create one, create it
      if (!existingSession && shouldCreateSession) {
        const newSession = await createSession(user.id, deviceInfo);
        if (newSession) {
          existingSession = newSession;
          sessions.unshift(newSession);
        }
      }
      
      return {
        user: { id: user.id, email: user.email ?? "" },
        profile,
        loading: false,
        currentSession: existingSession || null,
        sessions,
      };
    };

    const init = async () => {
      try {
        // First, set up the auth state change listener BEFORE checking session
        // This ensures we don't miss any auth events
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          
          console.log('Auth state change:', event, session?.user?.id);
          
          if (!session?.user) {
            // Only set to logged out if we've completed init or this is a SIGNED_OUT event
            if (initDone || event === 'SIGNED_OUT') {
              setState({ user: null, profile: null, loading: false, currentSession: null, sessions: [] });
            }
            return;
          }

          const userData = await loadUserData(session.user);
          if (!mounted || !userData) return;

          // Only create session on actual sign in event
          if (event === 'SIGNED_IN') {
            const deviceInfo = getDeviceInfo();
            const newSession = await createSession(session.user.id, deviceInfo);
            if (newSession) {
              userData.currentSession = newSession;
              // Add the new session to the sessions array
              userData.sessions = [newSession, ...userData.sessions];
            }
          }

          setState(userData);
          initDone = true;
        });

        // Store subscription cleanup
        subscriptionRef.current = subscription;

        // Now check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('getSession error:', error);
        }
        
        if (!mounted) return;
        
        if (!session?.user) {
          // No session found - user is not logged in
          initDone = true;
          setState({ user: null, profile: null, loading: false, currentSession: null, sessions: [] });
          return;
        }

        // Session found - load user data
        // Pass true to create session if it doesn't exist (handles page reload after login)
        const userData = await loadUserData(session.user, true);
        if (!mounted) return;
        
        initDone = true;
        if (userData) {
          setState(userData);
        }
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

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscriptionRef.current?.unsubscribe();
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
