"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

const PUBLIC_ROUTES = ['/login', '/signup'];
const PUBLIC_PREFIX_ROUTES = ['/share']; // Routes that start with this prefix are public
const ADMIN_ONLY_ROUTES = ['/permissions', '/audit', '/insights'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || PUBLIC_PREFIX_ROUTES.some(prefix => pathname?.startsWith(prefix));
    const isAdminRoute = ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route));
    const isAdmin = profile?.role === 'admin';

    // Redirect authenticated users away from login/signup
    if (user && PUBLIC_ROUTES.includes(pathname)) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/dataroom';
      router.push(redirect);
      return;
    }

    // Redirect unauthenticated users to login (except public routes)
    if (!user && !isPublicRoute) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Redirect non-admin users away from admin routes
    if (user && isAdminRoute && !isAdmin) {
      router.push('/dataroom');
      return;
    }
  }, [user, profile, loading, pathname, router]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || PUBLIC_PREFIX_ROUTES.some(prefix => pathname?.startsWith(prefix));
  const isAdminRoute = ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route));
  const isAdmin = profile?.role === 'admin';

  // Don't render protected content for unauthenticated users (except public routes)
  if (!user && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render admin content for non-admin users
  if (user && isAdminRoute && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
