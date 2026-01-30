import jwt from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';

export interface IapJwtPayload {
  iss: string;
  aud: string;
  sub: string;
  email?: string;
  exp: number;
  iat: number;
  [key: string]: unknown;
}

interface TokenValidationResult {
  valid: boolean;
  payload?: IapJwtPayload;
  error?: string;
}

class IapJwtService {
  private jwksClient: JwksClient;
  private audience: string;
  private issuer: string;

  constructor() {
    this.audience = process.env.IAP_AUDIENCE || '';
    this.issuer = 'https://cloud.google.com/iap';
    this.jwksClient = jwksClient({
      jwksUri: 'https://www.gstatic.com/iap/verify/public_key-jwk',
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

  async validateIapJwt(token: string): Promise<TokenValidationResult> {
    try {
      if (!this.audience) {
        return { valid: false, error: 'Missing IAP audience' };
      }

      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.header?.kid) {
        return { valid: false, error: 'Invalid token format' };
      }

      const publicKey = await this.getPublicKey(decoded.header.kid);
      const verified = jwt.verify(token, publicKey, {
        algorithms: ['ES256'],
        issuer: this.issuer,
        audience: this.audience,
      }) as IapJwtPayload;

      return { valid: true, payload: verified };
    } catch (error: any) {
      return { valid: false, error: error?.message || 'IAP token validation failed' };
    }
  }
}

export default new IapJwtService();
