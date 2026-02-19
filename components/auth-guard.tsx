"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

const PUBLIC_ROUTES = ["/login", "/signup"];
const PUBLIC_PREFIX_ROUTES = ["/share"];
const ADMIN_ONLY_ROUTES = ["/permissions", "/audit", "/insights"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const path = pathname ?? "";

  useEffect(() => {
    if (loading) return;

    const isPublicRoute =
      PUBLIC_ROUTES.includes(path) || PUBLIC_PREFIX_ROUTES.some((prefix) => path.startsWith(prefix));
    const isAdminRoute = ADMIN_ONLY_ROUTES.some((route) => path.startsWith(route));
    const isAdmin = profile?.role === "admin";

    if (user && PUBLIC_ROUTES.includes(path)) {
      const params = new URLSearchParams(window.location.search);
      router.push(params.get("redirect") || "/dataroom");
      return;
    }

    if (!user && !isPublicRoute) {
      router.push(`/login?redirect=${encodeURIComponent(path)}`);
      return;
    }

    if (user && isAdminRoute && !isAdmin) {
      router.push("/dataroom");
      return;
    }
  }, [user, profile, loading, path, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isPublicRoute =
    PUBLIC_ROUTES.includes(path) || PUBLIC_PREFIX_ROUTES.some((prefix) => path.startsWith(prefix));
  const isAdminRoute = ADMIN_ONLY_ROUTES.some((route) => path.startsWith(route));
  const isAdmin = profile?.role === "admin";

  if (!user && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user && isAdminRoute && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
