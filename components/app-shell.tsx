"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DataRoomProvider } from "@/contexts/dataroom-context";

const AUTH_PATHS = ["/login", "/signup"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) => pathname?.startsWith(p));

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <DataRoomProvider>
      <SidebarProvider>
        <AppSidebar />
        {children}
      </SidebarProvider>
    </DataRoomProvider>
  );
}
