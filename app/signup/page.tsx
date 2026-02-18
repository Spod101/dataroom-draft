"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
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

export default function SignUpPage() {
  // Signup disabled – logic and UI commented out below
  /*
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { 
          emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/dataroom`,
          data: {
            name: name.trim() || email.trim().split("@")[0],
          }
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center auth-page-bg px-4 py-12">
        <Card className="w-full max-w-sm shadow-lg border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-2 text-center pb-2 pt-8 px-8">
            <CardTitle className="text-2xl font-semibold tracking-tight">Check your email</CardTitle>
            <CardDescription>We sent a confirmation link to {email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-8 pb-6">
            <p className="text-sm text-muted-foreground text-center">
              Click the link in the email to confirm your account and sign in.
            </p>
          </CardContent>
          <CardFooter className="px-8 pb-8 pt-2">
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full h-10">Back to sign in</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center auth-page-bg px-4 py-12">
      <Card className="w-full max-w-sm shadow-lg border-0 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center pb-2 pt-8 px-8">
          <CardTitle className="text-2xl font-semibold tracking-tight">Create an account</CardTitle>
          <CardDescription>Sign up to access the data room</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 px-8 pb-6">
            <FieldGroup className="space-y-5">
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  disabled={loading}
                  className="h-10"
                />
              </Field>
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
                  autoComplete="new-password"
                  required
                  minLength={6}
                  disabled={loading}
                  className="h-10"
                />
              </Field>
            </FieldGroup>
            {error && <FieldError className="text-sm">{error}</FieldError>}
          </CardContent>
          <CardFooter className="flex flex-col gap-5 px-8 pb-8 pt-2">
            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? "Creating account…" : "Sign up"}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              Already have an account?{" "}
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
  */
  return (
    <div className="min-h-screen flex items-center justify-center auth-page-bg px-4 py-12">
      <Card className="w-full max-w-sm shadow-lg border-0 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center pb-2 pt-8 px-8">
          <CardTitle className="text-2xl font-semibold tracking-tight">Sign up disabled</CardTitle>
          <CardDescription>Use sign in if you already have an account.</CardDescription>
        </CardHeader>
        <CardFooter className="px-8 pb-8 pt-2">
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full h-10">Sign in</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
