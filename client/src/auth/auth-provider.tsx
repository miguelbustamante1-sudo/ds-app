import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PermissionMap } from '@shared/types/permissions';
import { useSessionMonitor } from '@/hooks/use-session-monitor';
import { SessionExpirationModal } from '@/components/layouts/shared/dialogs/session-expiration-modal';
import { toast } from '@/hooks/use-toast';

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
  teamMemberId?: number;
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
    teamMemberId: data.teamMemberId != null ? Number(data.teamMemberId) : undefined,
  };
};

const loadUser = async (): Promise<AuthUser | null> => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    localStorage.removeItem(SESSION_EXPIRES_KEY);
    return null;
  }

  const data = await response.json();

  if (data.expiresAt) {
    localStorage.setItem(SESSION_EXPIRES_KEY, String(data.expiresAt));
  }

  return mapUser(data.user);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [enableDevLogin, setEnableDevLogin] = useState(false);
  const navigate = useNavigate();

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
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
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

  // Handle 403 Forbidden responses (see api.ts) — the user is authenticated
  // but lacks permission for whatever they tried to do. Bounce them back to
  // the dashboard with a toast instead of leaving them stuck on a page that
  // just failed to load its data.
  useEffect(() => {
    const handleForbidden = () => {
      toast({
        title: 'Access denied',
        description: "You don't have permission to do that.",
        variant: 'destructive',
      });
      navigate('/');
    };

    window.addEventListener('auth:forbidden', handleForbidden);
    return () => window.removeEventListener('auth:forbidden', handleForbidden);
  }, [navigate]);

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
    fetchDevConfig().then((cfg) => setEnableDevLogin(cfg.enableDevLogin));

    // Only attempt refresh when a session indicator exists in localStorage.
    // The key is written on every successful refresh and removed on logout/failure,
    // so its absence means no session — skipping the call avoids the 401 on the
    // login page and after logout without needing a sessionStorage flag.
    if (localStorage.getItem(SESSION_EXPIRES_KEY)) {
      refresh().catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
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
