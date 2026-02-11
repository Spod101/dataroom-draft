"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Monitor, Tablet, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SessionsPage() {
  const { sessions, currentSession, refreshSessions, signOutAllDevices } = useAuth();
  const [revoking, setRevoking] = useState<string | null>(null);

  const getDeviceIcon = (deviceInfo: string) => {
    const lower = deviceInfo.toLowerCase();
    if (lower.includes("android") || lower.includes("ios")) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (lower.includes("tablet") || lower.includes("ipad")) {
      return <Tablet className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    const { error } = await supabase
      .from("user_sessions")
      .delete()
      .eq("id", sessionId);

    if (!error) {
      await refreshSessions();
    }
    setRevoking(null);
  };

  const handleSignOutAll = async () => {
    if (confirm("Are you sure you want to sign out from all devices? You will be logged out from this device as well.")) {
      await signOutAllDevices();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Active Sessions"
        description="Manage your active sessions across all devices"
      />

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          You have {sessions.length} active session{sessions.length !== 1 ? "s" : ""}
        </p>
        {sessions.length > 1 && (
          <Button variant="destructive" size="sm" onClick={handleSignOutAll}>
            Sign out all devices
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {sessions.map((session) => {
          const isCurrentSession = currentSession?.id === session.id;
          return (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getDeviceIcon(session.device_info)}</div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {session.device_info}
                        {isCurrentSession && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Last active: {formatDate(session.last_activity)}
                      </CardDescription>
                      {session.ip_address && (
                        <CardDescription className="text-xs mt-1">
                          IP: {session.ip_address}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  {!isCurrentSession && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={revoking === session.id}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Created: {new Date(session.created_at).toLocaleString()}</p>
                  <p>Expires: {new Date(session.expires_at).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {sessions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No active sessions found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
