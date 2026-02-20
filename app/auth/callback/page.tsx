"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Processing");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase client automatically handles the URL parameters and session
        // The session is set when detectSessionInUrl is enabled
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (session) {
          setStatus("Redirecting...");
          // Give the auth context a moment to pick up the session
          setTimeout(() => {
            router.push("/dataroom");
          }, 500);
        } else {
          // Check if there's an error in the URL
          const errorCode = searchParams.get("error");
          const errorDescription = searchParams.get("error_description");

          if (errorCode) {
            throw new Error(
              errorDescription || `Authentication error: ${errorCode}`
            );
          }

          throw new Error("No session found. Authentication may have failed.");
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(
          err instanceof Error ? err.message : "Authentication failed"
        );
        setStatus("Error");
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center auth-page-bg px-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-0 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center pb-2 pt-8 px-8">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {error ? "Authentication Error" : "Completing Sign In"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {error
              ? "An error occurred during authentication"
              : "Please wait..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 px-8">
          {error ? (
            <div className="space-y-4 w-full">
              <p className="text-sm text-destructive text-center break-words">
                {error}
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <div className="space-y-4 w-full flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{status}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
