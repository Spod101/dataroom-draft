import { supabase } from './supabase';

export type UserSession = {
  id: string;
  user_id: string;
  device_info: string;
  created_at: string;
  expires_at: string;
};

const SESSION_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string, deviceInfo: string): Promise<UserSession | null> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MS);

  // Check if a session already exists for this device
  const { data: existingSessions } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('device_info', deviceInfo)
    .gte('expires_at', now.toISOString())
    .limit(1);

  // Return existing session if found
  if (existingSessions && existingSessions.length > 0) {
    return existingSessions[0] as UserSession;
  }

  // Create new session
  const { data, error } = await supabase
    .from('user_sessions')
    .insert({
      user_id: userId,
      device_info: deviceInfo,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create session:', error);
    return null;
  }

  return data as UserSession;
}

export async function getUserSessions(userId: string): Promise<UserSession[]> {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get sessions:', error);
    return [];
  }

  return data as UserSession[];
}

export async function revokeSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('id', sessionId);

  return !error;
}

export async function revokeAllUserSessions(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', userId);

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
