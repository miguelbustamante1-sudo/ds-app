import axios from 'axios';
import jwt from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';
import { TokenPayload } from './types';

interface TokenValidationResult {
  valid: boolean;
  payload?: any;
  error?: string;
}

/**
 * OneLogin Service
 * Handles OIDC operations: token validation, JWKS caching
 */
class OneLoginService {
  private jwksClient: JwksClient;
  private jwksUri: string;
  private domain: string;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.domain = process.env.ONELOGIN_DOMAIN || '';
    this.clientId = process.env.ONELOGIN_CLIENT_ID || '';
    this.clientSecret = process.env.ONELOGIN_CLIENT_SECRET || '';
    this.jwksUri = process.env.ONELOGIN_JWKS_URI || '';

    this.jwksClient = jwksClient({
      jwksUri: this.jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 60 * 60 * 1000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  /**
   * Get public key by kid (key ID) from JWKS
   */
  private async getPublicKey(kid: string): Promise<string> {
    const key = await this.jwksClient.getSigningKey(kid);
    return key.getPublicKey();
  }

  /**
   * Validate JWT token from OneLogin
   * Uses getKey callback for jwt.verify
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      if (!this.domain || !this.clientId || !this.jwksUri) {
        return { valid: false, error: 'Missing OneLogin configuration' };
      }

      // Decode without verification first to get header
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded) {
        return { valid: false, error: 'Invalid token format' };
      }

      const header = decoded.header;
      if (!header || !header.kid) {
        return { valid: false, error: 'Missing token header kid' };
      }

      const publicKey = await this.getPublicKey(header.kid);
      const verified = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: `https://${this.domain}/oidc/2`,
        audience: this.clientId,
      }) as TokenPayload;

      return {
        valid: true,
        payload: verified,
      };
    } catch (error: any) {
      console.error('Token validation failed:', error.message);
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Exchange authorization code for tokens
   * Called by backend after user callback (frontend does the redirect)
   */
  async exchangeCodeForTokens(code: string): Promise<any> {
    try {
      if (!this.domain || !this.clientId || !this.clientSecret) {
        throw new Error('Missing OneLogin configuration');
      }

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: process.env.ONELOGIN_REDIRECT_URI || '',
      });

      const response = await axios.post(
        `https://${this.domain}/oidc/2/token`,
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      return response.data;
    } catch (error) {
      console.error('Code exchange failed:', error);
      throw new Error('Unable to exchange authorization code');
    }
  }

  /**
   * Exchange refresh token for new access token
   */
  async exchangeRefreshToken(refreshToken: string): Promise<any> {
    try {
      if (!this.domain || !this.clientId || !this.clientSecret) {
        throw new Error('Missing OneLogin configuration');
      }

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      const response = await axios.post(
        `https://${this.domain}/oidc/2/token`,
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      return response.data;
    } catch (error) {
      console.error('Refresh token exchange failed:', error);
      throw new Error('Unable to refresh access token');
    }
  }

  /**
   * Get user info from OneLogin (optional)
   */
  async getUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(`https://${this.domain}/oidc/2/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      throw new Error('Unable to fetch user info from OneLogin');
    }
  }
}

export default new OneLoginService();
