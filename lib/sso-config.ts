/**
 * SSO Configuration for different identity providers
 * This file manages OAuth/OIDC provider settings
 */

export interface SSOProviderConfig {
  id: string;
  name: string;
  icon?: string;
  clientId: string;
  clientSecret?: string; // Only needed server-side
  discoveryUrl?: string; // For OIDC providers
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  scopes?: string[];
}

/**
 * Get SSO provider configuration from environment
 * Supports OIDC and standard OAuth2 providers
 */
export function getSSOProviderConfig(): SSOProviderConfig | null {
  // Check for OIDC configuration
  const oidcClientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID;
  const oidcDiscoveryUrl = process.env.NEXT_PUBLIC_OIDC_DISCOVERY_URL;

  if (oidcClientId && oidcDiscoveryUrl) {
    return {
      id: "oidc",
      name: "Company SSO",
      clientId: oidcClientId,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      discoveryUrl: oidcDiscoveryUrl,
      scopes: ["openid", "email", "profile"],
    };
  }

  // Check for custom OAuth2 configuration
  const customClientId = process.env.NEXT_PUBLIC_CUSTOM_OAUTH_CLIENT_ID;
  const customAuthUrl = process.env.NEXT_PUBLIC_CUSTOM_OAUTH_AUTH_URL;
  const customTokenUrl = process.env.CUSTOM_OAUTH_TOKEN_URL;

  if (customClientId && customAuthUrl && customTokenUrl) {
    return {
      id: "custom-oauth",
      name: "Company SSO",
      clientId: customClientId,
      clientSecret: process.env.CUSTOM_OAUTH_CLIENT_SECRET,
      authorizationEndpoint: customAuthUrl,
      tokenEndpoint: customTokenUrl,
      userinfoEndpoint: process.env.CUSTOM_OAUTH_USERINFO_URL,
      scopes: ["openid", "email", "profile"],
    };
  }

  return null;
}

/**
 * Environment variables needed for SSO configuration
 * Add these to your .env.local file for your specific SSO provider
 *
 * For OIDC providers:
 * - NEXT_PUBLIC_OIDC_CLIENT_ID=your_client_id
 * - NEXT_PUBLIC_OIDC_DISCOVERY_URL=https://.../.well-known/openid-configuration
 * - OIDC_CLIENT_SECRET=your_client_secret
 *
 * For custom OAuth2 providers:
 * - NEXT_PUBLIC_CUSTOM_OAUTH_CLIENT_ID=your_client_id
 * - NEXT_PUBLIC_CUSTOM_OAUTH_AUTH_URL=https://provider.com/oauth/authorize
 * - CUSTOM_OAUTH_TOKEN_URL=https://provider.com/oauth/token (server-only)
 * - CUSTOM_OAUTH_CLIENT_SECRET=your_client_secret (server-only)
 * - CUSTOM_OAUTH_USERINFO_URL=https://provider.com/oauth/userinfo (optional)
 */
