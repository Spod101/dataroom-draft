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
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });

  const fetchProfile = React.useCallback(async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("id", userId)
      .single();
    if (error || !data) return null;
    return data as UserProfile;
  }, []);

  React.useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session?.user) {
        setState({ user: null, profile: null, loading: false });
        return;
      }
      const profile = await fetchProfile(session.user.id);
      if (!mounted) return;
      setState({
        user: { id: session.user.id, email: session.user.email ?? "" },
        profile,
        loading: false,
      });
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (!session?.user) {
        setState({ user: null, profile: null, loading: false });
        return;
      }
      const profile = await fetchProfile(session.user.id);
      if (!mounted) return;
      setState({
        user: { id: session.user.id, email: session.user.email ?? "" },
        profile,
        loading: false,
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, profile: null, loading: false });
  }, []);

  const value: AuthContextValue = {
    ...state,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
