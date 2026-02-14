import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import type { PermissionMap } from '@shared/types/permissions';
import { useSessionMonitor } from '@/hooks/use-session-monitor';
import { SessionExpirationModal } from '@/components/layouts/shared/dialogs/session-expiration-modal';

const SESSION_EXPIRES_KEY = 'session_expires_at';

/** Cached promise so we only fetch once per page load */
let devConfigPromise: Promise<{ enableDevLogin: boolean; devUsername: string }> | null = null;
function fetchDevConfig() {
  if (!devConfigPromise) {
    devConfigPromise = fetch('/api/auth/dev-config')
      .then((r) => (r.ok ? r.json() : { enableDevLogin: false, devUsername: '' }))
      .catch(() => ({ enableDevLogin: false, devUsername: '' }));
  }
  return devConfigPromise;
}

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

const loadUser = async (): Promise<AuthUser | null> => {
  const response = await fetch('/api/auth/me', {
    credentials: 'include',
  });

  if (response.status === 401) {
    // Clear session expiration on auth failure
    localStorage.removeItem(SESSION_EXPIRES_KEY);
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
  const [enableDevLogin, setEnableDevLogin] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const me = await loadUser();
      setUser(me);
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_EXPIRES_KEY);
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => undefined);

    window.location.href = '/auth/signin';
  }, []);

  // Session monitoring
  const {
    timeRemaining,
    isWarningVisible,
    isExpired,
    refreshSession,
  } = useSessionMonitor({
    onExpired: logout,
    onRefreshSuccess: (newExpiresAt) => {
      console.log('Session refreshed, new expiration:', new Date(newExpiresAt));
    },
    onRefreshError: (error) => {
      console.error('Session refresh error:', error);
    },
  });

  // Handle session expiration
  useEffect(() => {
    if (isExpired && user) {
      logout();
    }
  }, [isExpired, user, logout]);

  const devLogin = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        credentials: 'include',
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

      // Store expiration time (NOT the token)
      if (data.expiresAt) {
        localStorage.setItem(SESSION_EXPIRES_KEY, String(data.expiresAt));
      }

      // Load user data
      await refresh();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  useEffect(() => {
    // Fetch dev config from server (replaces VITE_* env vars)
    fetchDevConfig().then((cfg) => setEnableDevLogin(cfg.enableDevLogin));

    // Skip initial refresh on callback page - it will handle auth itself
    if (window.location.pathname === '/auth/callback') {
      setLoading(false);
      return;
    }
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
    [user, loading, logout, enableDevLogin],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Session expiration modal - only show when user is logged in */}
      {user && (
        <SessionExpirationModal
          open={isWarningVisible}
          timeRemaining={timeRemaining}
          onRefresh={refreshSession}
          onLogout={logout}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
