"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

const PUBLIC_ROUTES = ['/login', '/signup'];
const ADMIN_ONLY_ROUTES = ['/permissions', '/audit', '/insights'];

// Minimum time to wait before redirecting unauthenticated users
// This prevents race conditions where the session hasn't loaded yet
const MIN_AUTH_WAIT_MS = 100;

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    // Reset mount time on pathname change
    mountTimeRef.current = Date.now();
    setAuthCheckComplete(false);
  }, [pathname]);

  useEffect(() => {
    // Don't redirect while loading to avoid flickering
    if (loading) {
      setAuthCheckComplete(false);
      return;
    }

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isAdminRoute = ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route));
    const isAdmin = profile?.role === 'admin';

    // Redirect authenticated users away from public routes (this can happen immediately)
    if (user && isPublicRoute) {
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/dataroom';
      router.push(redirect);
      return;
    }
    
    // Redirect non-admin users away from admin routes (this can happen immediately)
    if (user && isAdminRoute && !isAdmin) {
      router.push('/dataroom');
      return;
    }

    // For unauthenticated redirects, add a small delay to prevent race conditions
    // This gives the auth state a chance to fully initialize
    if (!user && !isPublicRoute) {
      const timeSinceMount = Date.now() - mountTimeRef.current;
      const remainingWait = Math.max(0, MIN_AUTH_WAIT_MS - timeSinceMount);
      
      const timeoutId = setTimeout(() => {
        // Double-check that we still don't have a user before redirecting
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }, remainingWait);
      
      return () => clearTimeout(timeoutId);
    }

    setAuthCheckComplete(true);
  }, [user, profile, loading, pathname, router]);

  // Show loading spinner while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isAdminRoute = ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route));
  const isAdmin = profile?.role === 'admin';
  
  // Don't render content while redirecting
  if (!user && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user && isAdminRoute && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
