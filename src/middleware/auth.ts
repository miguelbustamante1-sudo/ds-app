import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';
import oneloginService from '../services/oneloginService';
import userService from '../services/userService';
import googleOidcService from '../services/googleOidcService';
import iapJwtService from '../services/iapJwtService';
import {
  resolvePermissions,
  PermissionMap,
  PermissionSource,
  can,
  PermissionAction,
} from '../services/permissionResolver';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
    roles: string[];
    avatarUrl?: string | undefined;
    permissions?: PermissionMap;
  };
}

/**
 * Main authentication middleware
 * Validates JWT token from OneLogin and populates req.user
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const permissionsSource = (process.env.PERMISSIONS_SOURCE as PermissionSource | undefined) || 'db';

    const iapAssertionHeader = req.headers['x-goog-iap-jwt-assertion'];
    const iapToken = typeof iapAssertionHeader === 'string' ? iapAssertionHeader : undefined;

    if (iapToken) {
      const validation = await iapJwtService.validateIapJwt(iapToken);
      if (!validation.valid || !validation.payload) {
        res.status(401).json({ error: 'Invalid or expired IAP token' });
        return;
      }

      const rawEmail = req.headers['x-goog-authenticated-user-email'];
      const emailHeader =
        typeof rawEmail === 'string' ? rawEmail.split(':').slice(1).join(':') : undefined;

      const user = await userService.syncUserFromIapToken(validation.payload, emailHeader);
      const permissions = await resolvePermissions(permissionsSource, {
        userId: user.id,
        tokenPayload: validation.payload,
      });

      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        roles: user.roles,
        avatarUrl: user.avatarUrl ?? undefined,
        permissions,
      };

      next();
      return;
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    console.log('Auth Middleware: Authorization Header:', authHeader ? 'present' : 'missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    console.log('Auth Middleware: Starting token validation');
    console.log('Token (first 50 chars):', token?.substring(0, 50));
    console.log('NODE_ENV:', process.env.NODE_ENV);
    // Try dev JWT token first (development only)
    if (process.env.NODE_ENV !== 'production') {
      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
        console.log('Attempting dev JWT validation, NODE_ENV:', process.env.NODE_ENV);
        console.log('JWT_SECRET configured:', JWT_SECRET ? 'yes' : 'no');
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
        console.log('Dev JWT decoded successfully:', decoded.email);

        if (decoded.email) {
          const user = await userService.syncUserFromGoogleToken(decoded);
          const permissions = await resolvePermissions(permissionsSource, {
            userId: user.id,
            tokenPayload: decoded,
          });
          req.user = {
            id: user.id,
            email: user.email,
            firstName: user.firstName ?? undefined,
            lastName: user.lastName ?? undefined,
            roles: user.roles,
            avatarUrl: user.avatarUrl ?? undefined,
            permissions,
          };

          console.log('Dev JWT auth successful for user:', user.email);
          next();
          return;
        }
      } catch (devError: any) {
        // Dev token validation failed, continue to production auth methods
        console.log('Dev JWT validation failed:', devError?.name, devError?.message);
        console.log('Token (first 50 chars):', token?.substring(0, 50));
      }
    }

    // Try OneLogin first (primary SSO provider)
    const oneLoginConfigured =
      process.env.ONELOGIN_DOMAIN &&
      process.env.ONELOGIN_CLIENT_ID &&
      process.env.ONELOGIN_JWKS_URI;

    if (oneLoginConfigured) {
      const validation = await oneloginService.validateToken(token);

      if (validation.valid) {
        const user = await userService.syncUserFromToken(validation.payload);
        const permissions = await resolvePermissions(permissionsSource, {
          userId: user.id,
          tokenPayload: validation.payload,
        });

        req.user = {
          id: user.id,
          email: user.email,
          firstName: user.firstName ?? undefined,
          lastName: user.lastName ?? undefined,
          roles: user.roles,
          avatarUrl: user.avatarUrl ?? undefined,
          permissions,
        };

        next();
        return;
      }
    }

    // Fallback to Google ID token (Apps Script MVP)
    const googleValidation = await googleOidcService.validateIdToken(token);
    const googlePayload = googleValidation.valid
      ? googleValidation.payload
      : (await googleOidcService.validateAppsScriptToken(token)).payload;

    if (googlePayload) {
      const user = await userService.syncUserFromGoogleToken(googlePayload);
      const permissions = await resolvePermissions(permissionsSource, {
        userId: user.id,
        tokenPayload: googlePayload,
      });
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        roles: user.roles,
        avatarUrl: user.avatarUrl ?? undefined,
        permissions,
      };

      next();
      return;
    }

    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional: Require specific permission
 * Usage: router.post('/team-members', requirePermission('TeamMembers', 'create'), controller)
 */
export const requirePermission = (resource: string, action: PermissionAction) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const permissions = req.user.permissions || {};
    if (!can(permissions, resource, action)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

/**
 * Optional: Require specific role
 * Usage: router.post('/admin', requireRole('admin'), controller)
 */
export const requireRole = (role: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.user.roles.includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

/**
 * Optional: Require any of multiple roles
 * Usage: router.delete('/user/:id', requireAnyRole(['admin', 'manager']), controller)
 */
export const requireAnyRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.some((role) => req.user!.roles.includes(role))) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
