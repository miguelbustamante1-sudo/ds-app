import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUserDTO } from '@shared/dto';
import type { PermissionMap } from '@shared/types/permissions';

const enableDevLogin = import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true' || import.meta.env.DEV;

/**
 * Frontend-specific auth user with computed display name
 * Based on AuthUserDTO from shared
 */
export interface AuthUser {
  id?: number;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  roles: string[];
  permissions: PermissionMap;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
  devLogin?: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const mapUser = (data: any): AuthUser | null => {
  if (!data?.email) {
    return null;
  }

  const nameParts = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
  const name = nameParts || data.name || data.email;

  return {
    id: data.id,
    email: data.email,
    name,
    firstName: data.firstName,
    lastName: data.lastName,
    avatarUrl: data.avatarUrl || undefined,
    roles: Array.isArray(data.roles) ? data.roles : [],
    permissions: (data.permissions as PermissionMap) || {},
  };
};

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
  return {};
};

const loadUser = async (): Promise<AuthUser | null> => {
  const response = await fetch('/api/auth/me', {
    credentials: 'include',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    // Clear invalid token
    localStorage.removeItem('auth_token');
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to load user');
  }

  const data = await response.json();
  return mapUser(data);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const me = await loadUser();
      setUser(me);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
    }).catch(() => undefined);

    const returnUrl = new URL('/auth/signin', window.location.origin).toString();
    window.location.href = `https://accounts.google.com/Logout?continue=${encodeURIComponent(
      returnUrl,
    )}`;
  };

  const devLogin = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Login failed' };
      }

      const data = await response.json();

      // Store the token
      if (data.accessToken) {
        localStorage.setItem('auth_token', data.accessToken);
      }

      // Load user data
      await refresh();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      logout,
      // Only expose devLogin when enabled
      ...(enableDevLogin && { devLogin }),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
