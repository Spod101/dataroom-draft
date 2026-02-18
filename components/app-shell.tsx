"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider } from "@/contexts/auth-context";
import { DataRoomProvider } from "@/contexts/dataroom-context";
import { AuthGuard } from "@/components/auth-guard";

const AUTH_PATHS = ["/login" /* "/signup" signup disabled */];
const PUBLIC_PATHS = ["/share"]; // Public routes that don't need auth

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) => pathname?.startsWith(p));
  const isPublicPage = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));

  // Public pages (like share links) don't need auth providers
  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      <AuthGuard>
        {isAuthPage ? (
          <>{children}</>
        ) : (
          <DataRoomProvider>
            <SidebarProvider>
              <AppSidebar />
              {children}
            </SidebarProvider>
          </DataRoomProvider>
        )}
      </AuthGuard>
    </AuthProvider>
  );
}
