import express, { Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import oneloginService from '../services/oneloginService';
import userService from '../services/userService';
import googleOidcService from '../services/googleOidcService';

const router = express.Router();
const oauthStateTtlMs = 5 * 60 * 1000;

const base64Url = (input: Buffer): string =>
  input
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const getOauthStateSecret = (): string =>
  process.env.ONELOGIN_STATE_SECRET || process.env.ONELOGIN_CLIENT_SECRET || '';

const createOauthState = (): string => {
  const secret = getOauthStateSecret();
  if (!secret) {
    throw new Error('Missing OneLogin state secret');
  }

  const nonce = base64Url(crypto.randomBytes(16));
  const timestamp = Date.now().toString();
  const payload = `${nonce}.${timestamp}`;
  const signature = base64Url(crypto.createHmac('sha256', secret).update(payload).digest());

  return `${payload}.${signature}`;
};

const verifyOauthState = (state: string | undefined): boolean => {
  if (!state) {
    return false;
  }

  const secret = getOauthStateSecret();
  if (!secret) {
    return false;
  }

  const parts = state.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const payload = `${parts[0]}.${parts[1]}`;
  const signature = base64Url(crypto.createHmac('sha256', secret).update(payload).digest());
  if (signature.length !== parts[2]!.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(parts[2]!))) {
    return false;
  }

  const timestamp = Number(parts[1]);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= oauthStateTtlMs;
};

/**
 * POST /api/auth/exchange-code
 * Exchange authorization code for access token
 * Called by frontend after user logs in with OneLogin
 */
router.post('/exchange-code', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Authorization code is required' });
      return;
    }

    // Exchange code for tokens with OneLogin
    const tokens = await oneloginService.exchangeCodeForTokens(code);

    // Validate the access token
    const validation = await oneloginService.validateToken(tokens.access_token);

    if (!validation.valid) {
      res.status(401).json({ error: 'Token validation failed' });
      return;
    }

    // Sync user from token
    const user = await userService.syncUserFromToken(validation.payload);

    // Return token and user info
    res.json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Code exchange error:', error);
    res.status(500).json({ error: error.message || 'Failed to exchange code' });
  }
});

/**
 * GET /api/auth/login
 * Redirect to OneLogin authorization URL (browser-based flow)
 */
router.get('/login', (req: AuthenticatedRequest, res: Response) => {
  try {
    const domain = process.env.ONELOGIN_DOMAIN;
    const clientId = process.env.ONELOGIN_CLIENT_ID;
    const redirectUri = process.env.ONELOGIN_REDIRECT_URI;
    const scopes = process.env.ONELOGIN_SCOPES || 'openid profile email';

    if (!domain || !clientId || !redirectUri) {
      res.status(500).json({ error: 'Missing OneLogin configuration' });
      return;
    }

    const state = createOauthState();
    const nonce = base64Url(crypto.randomBytes(16));
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      nonce,
    });

    res.redirect(`https://${domain}/oidc/2/auth?${params.toString()}`);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to initiate login' });
  }
});

/**
 * GET /api/auth/callback
 * Handle OneLogin authorization callback and exchange code for tokens
 */
router.get('/callback', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query as Record<string, string>;

    if (error) {
      res.status(401).json({ error: error_description || error });
      return;
    }

    if (!code) {
      res.status(400).json({ error: 'Authorization code is required' });
      return;
    }

    if (!verifyOauthState(state)) {
      res.status(400).json({ error: 'Invalid or expired OAuth state' });
      return;
    }

    const tokens = await oneloginService.exchangeCodeForTokens(code);
    const validation = await oneloginService.validateToken(tokens.access_token);

    if (!validation.valid) {
      res.status(401).json({ error: 'Token validation failed' });
      return;
    }

    const user = await userService.syncUserFromToken(validation.payload);
    const redirectTarget = process.env.ONELOGIN_POST_LOGIN_REDIRECT;

    if (redirectTarget) {
      const redirectUrl = new URL(redirectTarget);
      const hashParams = new URLSearchParams({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || '',
        expires_in: tokens.expires_in ? String(tokens.expires_in) : '',
      });

      redirectUrl.hash = hashParams.toString();
      res.redirect(redirectUrl.toString());
      return;
    }

    res.json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Callback error:', error);
    res.status(500).json({ error: error.message || 'Failed to handle callback' });
  }
});

/**
 * POST /api/auth/verify
 * Verify current token validity
 */
router.post('/verify', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    valid: true,
    user: req.user,
  });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json(req.user);
});

/**
 * POST /api/auth/logout
 * Clear authentication (frontend should clear tokens)
 */
router.post('/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    // Call OneLogin to refresh token
    const tokens = await oneloginService.exchangeRefreshToken(refreshToken);

    res.json({
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * POST /auth/script-user
 * Validate a Google Apps Script identity token and return user identity
 */
router.post('/script-user', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.substring(7) : req.body?.token;

    if (!token) {
      res.status(400).json({ error: 'Missing token' });
      return;
    }

    const validation = await googleOidcService.validateAppsScriptToken(token);
    const data = validation.payload;
    const username = data?.email || data?.sub;

    if (!username) {
      res.status(401).json({ error: 'Token does not include user identity' });
      return;
    }

    res.json({
      username,
      name: data?.name,
      givenName: data?.given_name,
      familyName: data?.family_name,
    });
  } catch (error: any) {
    const message = error?.message || 'Token validation failed';
    res.status(401).json({ error: message });
  }
});

/**
 * POST /api/auth/dev-login
 * DEVELOPMENT ONLY: Bypass authentication for local testing
 * Creates a local JWT token for the hardcoded test user
 */
router.post('/dev-login', async (req: AuthenticatedRequest, res: Response) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Dev login not available in production' });
    return;
  }

  try {
    const { email, password } = req.body;

    // Hardcoded test credentials
    const DEV_USER_EMAIL = 'miguel.bustamante01@telusinternational.com';
    const DEV_USER_PASSWORD = process.env.DEV_USER_PASSWORD || 'dev-password-123';

    if (email !== DEV_USER_EMAIL || password !== DEV_USER_PASSWORD) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Get or create user from database
    let user = await userService.getUserById(1); // Assuming this is the user ID in your database

    if (!user) {
      // Fallback: try to find by email
      const authUserDb = (await import('../db/authUsers')).default;
      user = await authUserDb.getUserByEmail(DEV_USER_EMAIL);
    }

    if (!user) {
      res.status(404).json({ error: 'Test user not found in database. Please ensure the user exists in sec.auth_users' });
      return;
    }

    // Generate a local JWT token that mimics Google ID token structure
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    const tokenPayload = {
      sub: user.oneloginId || `dev-${user.id}`,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      given_name: user.firstName, // Keep snake_case as this is part of Google's token format
      family_name: user.lastName, // Keep snake_case as this is part of Google's token format
      picture: user.avatarUrl,
      iss: 'https://accounts.google.com',
      aud: process.env.GOOGLE_OIDC_CLIENT_ID || 'dev-client-id',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { algorithm: 'HS256' });

    // Update last login
    await userService.getUserById(user.id); // This triggers the last login update

    res.json({
      accessToken: token,
      refreshToken: token, // Same token for dev
      expiresIn: 86400, // 24 hours
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Dev login error:', error);
    res.status(500).json({ error: error.message || 'Dev login failed' });
  }
});

export default router;
