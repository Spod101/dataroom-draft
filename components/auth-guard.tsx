"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

const PUBLIC_ROUTES = ['/login', '/signup'];
const ADMIN_ONLY_ROUTES = ['/permissions', '/audit', '/insights'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isAdminRoute = ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route));
    const isAdmin = profile?.role === 'admin';

    if (!user && !isPublicRoute) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (user && isPublicRoute) {
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
      router.push(redirect);
    } else if (user && isAdminRoute && !isAdmin) {
      router.push('/dataroom');
    }
  }, [user, profile, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isAdminRoute = ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route));
  const isAdmin = profile?.role === 'admin';
  
  if ((!user && !PUBLIC_ROUTES.includes(pathname)) || (user && isAdminRoute && !isAdmin)) {
    return null;
  }

  return <>{children}</>;
}
