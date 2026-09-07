/**
 * Represents the decoded JWT payload from OneLogin OIDC
 */
export interface TokenPayload {
  sub: string;         // Unique OneLogin User ID
  email: string;       // User's email
  name?: string;       // Full name
  preferred_username?: string;
  picture?: string;    // Avatar URL
  exp: number;         // Expiration timestamp
  iat: number;         // Issued at
  iss: string;         // Issuer
  aud: string;         // Audience (Client ID)
  sid?: string;        // Session ID
  // Add other standard OIDC or custom OneLogin claims here
}