"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { LogIn } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
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
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        // Check if email is not confirmed
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

      // Success - AuthContext will handle the session
      // Router will redirect via AuthGuard
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
    } else {
      setEmailResent(true);
    }

    setResendingEmail(false);
  }

  async function handleSSOLogin(provider: string) {
    setSsoLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/auth/sso-initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "SSO login failed");
        setSsoLoading(false);
        return;
      }

      const data = await response.json();
      // Redirect to OAuth provider
      window.location.href = data.authUrl;
    } catch (err) {
      console.error("SSO error:", err);
      setError("An error occurred during SSO login");
      setSsoLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center auth-page-bg px-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-0 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center pb-2 pt-8 px-8">
          <CardTitle className="text-2xl font-semibold tracking-tight">Sign in</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your credentials to access the data room
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 px-8 pb-6">
            <FieldGroup className="space-y-5">
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
                  className="h-10"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="h-10"
                />
              </Field>
            </FieldGroup>
            {error && (
              <FieldError className="text-sm">{error}</FieldError>
            )}
            {showEmailNotConfirmed && (
              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
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
          <CardFooter className="flex flex-col gap-5 px-8 pb-8 pt-2">
            <Button type="submit" className="w-full h-10" disabled={loading || ssoLoading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>

            {/* SSO Section */}
            <div className="space-y-3 w-full">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card/95 px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-10"
                onClick={() => handleSSOLogin("sso")}
                disabled={loading || ssoLoading}
              >
                {ssoLoading ? (
                  <>
                    <LogIn className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in with your identity provider
                  </>
                )}
              </Button>
            </div>
            {/* Signup disabled
            <p className="text-muted-foreground text-center text-xs">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
                Sign up
              </Link>
            </p>
            */}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
