import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase configuration");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Generate OAuth state and PKCE parameters for security
 */
function generateOAuthParams() {
  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { state, codeVerifier, codeChallenge };
}

export async function POST(request: NextRequest) {
  try {
    const { provider } = await request.json();

    // Validate provider
    if (!provider || typeof provider !== "string") {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    // Get the origin for the redirect URL
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;
    const redirectUrl = `${origin}/auth/callback`;

    // Check if using Supabase built-in providers
    const builtInProviders = ["google", "github", "microsoft", "facebook"];
    
    if (builtInProviders.includes(provider)) {
      // Use Supabase's built-in OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error("Supabase OAuth error:", error);
        return NextResponse.json(
          { error: error.message || "Failed to initiate SSO" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        authUrl: data?.url || "",
        success: true,
      });
    }

    // Handle custom OIDC/OAuth2 provider
    if (provider === "sso" || provider === "oidc") {
      const clientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID;
      const discoveryUrl = process.env.NEXT_PUBLIC_OIDC_DISCOVERY_URL;
      const authUrl = process.env.NEXT_PUBLIC_OIDC_AUTH_URL;

      if (!clientId) {
        return NextResponse.json(
          { error: "SSO not configured. Please contact support." },
          { status: 503 }
        );
      }

      // For OIDC discovery URL, use standard OpenID Connect flow
      if (discoveryUrl || authUrl) {
        const params = generateOAuthParams();
        
        // Store state and code verifier in a temporary storage (ideally use redis/database)
        // For now, we'll encode them in the session
        const response = NextResponse.json({
          authUrl: authUrl || `${discoveryUrl}?client_id=${clientId}&redirect_uri=${redirectUrl}&response_type=code&scope=openid+email+profile&state=${params.state}`,
          success: true,
        });

        // Store state securely (you may want to use a database or redis)
        response.cookies.set("oauth_state", params.state, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 600, // 10 minutes
        });

        response.cookies.set("oauth_verifier", params.codeVerifier, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 600, // 10 minutes
        });

        return response;
      }
    }

    return NextResponse.json(
      { error: "Unsupported SSO provider" },
      { status: 400 }
    );
  } catch (error) {
    console.error("SSO initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate SSO login" },
      { status: 500 }
    );
  }
}
