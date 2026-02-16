"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmailNotConfirmed, setShowEmailNotConfirmed] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailResent, setEmailResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShowEmailNotConfirmed(false);
    setEmailResent(false);
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        // Check if the error is due to unconfirmed email
        if (authError.message.toLowerCase().includes("email not confirmed") || 
            authError.message.toLowerCase().includes("confirm your email")) {
          setShowEmailNotConfirmed(true);
          setError("Your email address has not been confirmed yet.");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      // Verify session exists
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Failed to establish session. Please try again.");
        setLoading(false);
        return;
      }

      // Get redirect URL
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/dataroom';
      
      // For production reliability, use a full page reload after a brief delay
      // This ensures the auth state is fully persisted and loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.href = redirect;
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    setResendingEmail(true);
    setError(null);

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });

    if (resendError) {
      setError(resendError.message);
      setResendingEmail(false);
      return;
    }

    setEmailResent(true);
    setResendingEmail(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Enter your credentials to access the data room
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
              </Field>
            </FieldGroup>
            {error && (
              <FieldError className="text-sm">{error}</FieldError>
            )}
            {showEmailNotConfirmed && (
              <div className="bg-muted/50 border border-border rounded-md p-3 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Please check your email inbox for a confirmation link. If you haven&apos;t received it, you can request a new one.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendConfirmation}
                  disabled={resendingEmail || emailResent}
                  className="w-full"
                >
                  {resendingEmail ? "Sending..." : emailResent ? "Email Sent!" : "Resend Confirmation Email"}
                </Button>
                {emailResent && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Confirmation email has been sent. Please check your inbox and spam folder.
                  </p>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
