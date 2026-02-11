import { supabase } from './supabase';

export type UserSession = {
  id: string;
  user_id: string;
  device_info: string;
  ip_address: string | null;
  last_activity: string;
  created_at: string;
  expires_at: string;
};

const SESSION_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;
const ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000;

export async function createSession(userId: string, deviceInfo: string, ipAddress?: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MS);

  const { data, error } = await supabase
    .from('user_sessions')
    .insert({
      user_id: userId,
      device_info: deviceInfo,
      ip_address: ipAddress || null,
      last_activity: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  return error ? null : (data as UserSession);
}

export async function updateSessionActivity(sessionId: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MS);

  const { error } = await supabase
    .from('user_sessions')
    .update({
      last_activity: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', sessionId);

  return !error;
}

export async function getUserSessions(userId: string): Promise<UserSession[]> {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('expires_at', new Date().toISOString())
    .order('last_activity', { ascending: false });

  return error ? [] : (data as UserSession[]);
}

export async function revokeSession(sessionId: string) {
  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('id', sessionId);

  return !error;
}

export async function revokeAllUserSessions(userId: string, exceptSessionId?: string) {
  let query = supabase.from('user_sessions').delete().eq('user_id', userId);
  
  if (exceptSessionId) query = query.neq('id', exceptSessionId);

  const { error } = await query;
  return !error;
}

export async function cleanupExpiredSessions() {
  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString());

  return !error;
}

export function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Server';
  
  const ua = navigator.userAgent;
  const browser = ua.includes('Firefox') ? 'Firefox' 
    : ua.includes('Chrome') ? 'Chrome'
    : ua.includes('Safari') ? 'Safari'
    : ua.includes('Edge') ? 'Edge' : 'Unknown';
  
  const os = ua.includes('Windows') ? 'Windows'
    : ua.includes('Mac') ? 'macOS'
    : ua.includes('Linux') ? 'Linux'
    : ua.includes('Android') ? 'Android'
    : ua.includes('iOS') ? 'iOS' : 'Unknown';

  return `${browser} on ${os}`;
}

export function shouldUpdateActivity(lastUpdate: number): boolean {
  return Date.now() - lastUpdate > ACTIVITY_UPDATE_INTERVAL;
}
