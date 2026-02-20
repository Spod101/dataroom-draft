# SSO Integration Guide

This guide explains how to integrate your company's SSO (Single Sign-On) with the dataroom application.

## Overview

The application now supports multiple authentication methods:
1. **Traditional email/password login** - Existing method
2. **SSO (Single Sign-On)** - New OAuth2/OIDC integration

## Supported SSO Providers

### Built-in Supabase Providers (Easy Setup)
- Google
- GitHub
- Microsoft
- Facebook

### Custom OAuth2/OIDC Providers
- Any company with OIDC compliance (Azure AD, Okta, Auth0, etc.)
- Custom enterprise SSO systems

## Setup Instructions

### Quick Setup: Using Supabase Built-in Providers (e.g., Google)

1. Go to your Supabase dashboard
2. Navigate to: **Authentication** → **Providers**
3. Enable the desired provider (e.g., Google)
4. Add your OAuth credentials from the provider's console
5. Set redirect URL: `[YOUR_APP_URL]/auth/callback`

The button will automatically appear on the login page once enabled.

### Advanced Setup: Custom OIDC/OAuth2 Provider

For integrating a custom provider like "Highly Succeed Inc." or your company's SSO:

#### Environment Variables

Add these to your `.env.local` file:

```bash
# For OIDC Provider Discovery (Recommended)
NEXT_PUBLIC_OIDC_CLIENT_ID=your_client_id
NEXT_PUBLIC_OIDC_DISCOVERY_URL=https://provider.com/.well-known/openid-configuration
OIDC_CLIENT_SECRET=your_client_secret

# OR for direct OAuth2 configuration
NEXT_PUBLIC_OIDC_AUTH_URL=https://provider.com/oauth/authorize
NEXT_PUBLIC_OIDC_CLIENT_ID=your_client_id
NEXT_PUBLIC_OIDC_USERINFO_URL=https://provider.com/oauth/userinfo
OIDC_CLIENT_SECRET=your_client_secret
```

#### Steps to Configure

1. **Get OAuth Credentials from Your SSO Provider**
   - Client ID (public)
   - Client Secret (keep private, server-only)
   - Authorization endpoint URL
   - Token endpoint URL
   - UserInfo endpoint URL (optional)

2. **Add Redirect URL to Your SSO Provider**
   - Set: `https://yourdomain.com/auth/callback`

3. **Set Environment Variables**
   - Add the variables above to `.env.local`
   - Restart your development server

4. **Test the Flow**
   - Go to login page
   - Click "Sign in with your identity provider"
   - You should be redirected to your SSO provider
   - After login, you should be redirected back to the app

## Enhanced Implementation: Custom OAuth Handler

For more control over the OAuth flow, you can create a custom handler:

```typescript
// app/api/auth/oauth-callback/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  try {
    // 1. Validate state parameter
    const storedState = request.cookies.get("oauth_state")?.value;
    if (state !== storedState) {
      throw new Error("Invalid state parameter");
    }

    // 2. Exchange code for token
    const tokenResponse = await fetch(
      process.env.OIDC_TOKEN_ENDPOINT || "",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code || "",
          client_id: process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || "",
          client_secret: process.env.OIDC_CLIENT_SECRET || "",
          redirect_uri: `${request.headers.get("origin")}/auth/callback`,
        }),
      }
    );

    const tokens = await tokenResponse.json();

    // 3. Get user info
    const userResponse = await fetch(
      process.env.OIDC_USERINFO_ENDPOINT || "",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    const userInfo = await userResponse.json();

    // 4. Create or update user in your database
    // (Implementation depends on your database schema)

    // 5. Create session and redirect
    const response = NextResponse.redirect(new URL("/dataroom", request.url));
    response.cookies.set("auth_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url)
    );
  }
}
```

## Troubleshooting

### "SSO not configured" error
- Check that `NEXT_PUBLIC_OIDC_CLIENT_ID` is set in `.env.local`
- Verify discovery URL or auth URL is correct
- Restart the development server after adding env variables

### "Invalid redirect URI"
- Verify the redirect URL matches exactly in your SSO provider settings
- Should be: `https://yourdomain.com/auth/callback`

### User not authenticated after callback
- Check browser console for errors
- Verify the OAuth state parameter is correct
- Check Supabase logs for session creation issues

### "401 Unauthorized" on API calls
- Ensure the access token is being stored correctly
- Check token expiration and refresh logic

## Using with Specific Providers

### Azure AD (Entra ID)
- Client ID: Application ID
- Tenant ID: Your tenant ID
- Discovery URL: `https://login.microsoftonline.com/{TENANT_ID}/.well-known/openid-configuration`

### Okta
- Discovery URL: `https://{YOUR_OKTA_DOMAIN}/.well-known/openid-configuration`

### Auth0
- Discovery URL: `https://{YOUR_AUTH0_DOMAIN}/.well-known/openid-configuration`

## File Structure

```
app/
├── login/page.tsx              # Login form with SSO button
├── auth/
│   └── callback/page.tsx       # OAuth callback handler
└── api/auth/
    ├── sso-initiate/route.ts   # Initiate OAuth flow
    └── ...
lib/
├── sso-config.ts              # SSO configuration utilities
└── supabase.ts                # Supabase client
```

## Security Considerations

1. **Never commit secrets** - Keep client secrets in `.env.local` (not version controlled)
2. **HTTPS required** - SSO only works over HTTPS in production
3. **State validation** - Always validate the state parameter to prevent CSRF
4. **PKCE flow** - Use Proof Key for Code Exchange for public clients
5. **Token storage** - Store tokens securely with HttpOnly cookies

## Next Steps

1. Obtain OAuth credentials from your SSO provider
2. Add environment variables to `.env.local`
3. Update the login UI if you want to customize the SSO button
4. Test the flow in development
5. Deploy and test in production

For more details, see:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [OAuth 2.0 Specification](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Specification](https://openid.net/connect/)
