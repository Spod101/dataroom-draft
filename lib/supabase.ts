import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env"
  );
}

// Custom storage that safely handles SSR and storage errors
const customStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors (e.g., in private browsing mode or quota exceeded)
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  },
};

/**
 * Supabase client for database, auth, storage, and realtime.
 * Use in Client Components, Server Components, API routes, and Server Actions.
 * 
 * Configuration optimized for:
 * - Reliable session recovery after tab idle
 * - Proper token refresh handling
 * - Network failure resilience
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'sb-auth-token',
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'dataroom-web',
    },
  },
  // Realtime: reduce reconnect noise after idle
  // Longer heartbeat interval = fewer dropped-connection events when tab is idle
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
    timeout: 30000,           // Wait 30s before declaring connection dead (default: 10s)
    heartbeatIntervalMs: 60000, // Heartbeat every 60s instead of default 30s
  },
});

/**
 * Helper to ensure auth session is valid before making requests.
 * Call this before operations that require authentication after potential idle.
 * 
 * @returns true if session is valid, false if no session or refresh failed
 */
export async function ensureValidSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('[Supabase] Session check error:', error.message);
      return false;
    }
    
    if (!session) {
      return false;
    }
    
    // Check if token is about to expire (within 5 minutes)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiresAtMs = expiresAt * 1000;
      const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
      
      if (expiresAtMs < fiveMinutesFromNow) {
        // Token is about to expire, try to refresh
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.warn('[Supabase] Session refresh failed:', refreshError.message);
          return false;
        }
      }
    }
    
    return true;
  } catch (err) {
    console.error('[Supabase] ensureValidSession error:', err);
    return false;
  }
}
