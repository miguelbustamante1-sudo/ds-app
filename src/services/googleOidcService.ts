import axios from 'axios';
import jwt from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';

export interface GoogleIdTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  exp: number;
  iat: number;
}

interface TokenValidationResult {
  valid: boolean;
  payload?: GoogleIdTokenPayload;
  error?: string;
}

class GoogleOidcService {
  private jwksClient: JwksClient;
  private clientId: string;
  private issuers: [string, ...string[]];

  constructor() {
    this.clientId = process.env.GOOGLE_OIDC_CLIENT_ID || '';
    this.issuers = ['https://accounts.google.com', 'accounts.google.com'];
    this.jwksClient = jwksClient({
      jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 60 * 60 * 1000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  private async getPublicKey(kid: string): Promise<string> {
    const key = await this.jwksClient.getSigningKey(kid);
    return key.getPublicKey();
  }

  async validateIdToken(token: string): Promise<TokenValidationResult> {
    try {
      if (!this.clientId) {
        return { valid: false, error: 'Missing Google OIDC client ID' };
      }

      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.header?.kid) {
        return { valid: false, error: 'Invalid token format' };
      }

      const publicKey = await this.getPublicKey(decoded.header.kid);
      const verified = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: this.issuers,
        audience: this.clientId,
      }) as GoogleIdTokenPayload;

      return { valid: true, payload: verified };
    } catch (error: any) {
      return { valid: false, error: error?.message || 'Google token validation failed' };
    }
  }

  async validateIdTokenViaTokenInfo(token: string): Promise<TokenValidationResult> {
    try {
      const response = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
        params: { id_token: token },
      });
      const data = response.data as Partial<GoogleIdTokenPayload> & {
        email_verified?: boolean | string;
      };

      if (!data.email && !data.sub) {
        return { valid: false, error: 'Token does not include user identity' };
      }

      const emailVerified =
        data.email_verified === true;

      const payload: GoogleIdTokenPayload = {
        iss: data.iss || 'https://accounts.google.com',
        sub: data.sub || '',
        aud: data.aud || '',
        exp: typeof data.exp === 'string' ? Number(data.exp) : data.exp || 0,
        iat: typeof data.iat === 'string' ? Number(data.iat) : data.iat || 0,
      };

      if (data.email !== undefined) {
        payload.email = data.email;
      }
      if (data.email_verified !== undefined) {
        payload.email_verified = emailVerified;
      }
      if (data.name !== undefined) {
        payload.name = data.name;
      }
      if (data.given_name !== undefined) {
        payload.given_name = data.given_name;
      }
      if (data.family_name !== undefined) {
        payload.family_name = data.family_name;
      }
      if (data.picture !== undefined) {
        payload.picture = data.picture;
      }

      return {
        valid: true,
        payload,
      };
    } catch (error: any) {
      const message =
        error?.response?.data?.error_description ||
        error?.response?.data?.error ||
        error?.message ||
        'Google token validation failed';
      return { valid: false, error: message };
    }
  }

  async validateAppsScriptToken(token: string): Promise<TokenValidationResult> {
    return this.validateIdTokenViaTokenInfo(token);
  }
}

export default new GoogleOidcService();
