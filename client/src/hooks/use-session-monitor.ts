import { useState, useEffect, useCallback, useRef } from 'react';

const WARNING_THRESHOLD_SECONDS = 30;
const PROACTIVE_REFRESH_THRESHOLD_SECONDS = 5 * 60; // 5 minutes before expiration
const CHECK_INTERVAL_MS = 1000;
const SESSION_EXPIRES_KEY = 'session_expires_at';

export interface UseSessionMonitorReturn {
  timeRemaining: number | null;
  isWarningVisible: boolean;
  isExpired: boolean;
  refreshSession: () => Promise<boolean>;
  dismissWarning: () => void;
}

interface UseSessionMonitorOptions {
  onExpired?: () => void;
  onRefreshSuccess?: (newExpiresAt: number) => void;
  onRefreshError?: (error: Error) => void;
}

export function useSessionMonitor(options: UseSessionMonitorOptions = {}): UseSessionMonitorReturn {
  const { onExpired, onRefreshSuccess, onRefreshError } = options;

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const expiredCallbackFired = useRef(false);
  const proactiveRefreshAttempted = useRef(false);

  // Get expiration time from localStorage
  const getExpirationTime = useCallback((): number | null => {
    const stored = localStorage.getItem(SESSION_EXPIRES_KEY);
    if (!stored) return null;
    const expiresAt = parseInt(stored, 10);
    return Number.isFinite(expiresAt) ? expiresAt : null;
  }, []);

  // Refresh session by calling the backend refresh endpoint
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (isRefreshing) return false;

    setIsRefreshing(true);
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Refresh failed' }));
        throw new Error(error.error || 'Failed to refresh session');
      }

      const data = await response.json();

      if (data.expiresAt) {
        localStorage.setItem(SESSION_EXPIRES_KEY, String(data.expiresAt));
        setIsWarningVisible(false);
        setIsExpired(false);
        expiredCallbackFired.current = false;
        proactiveRefreshAttempted.current = false;
        onRefreshSuccess?.(data.expiresAt);
        return true;
      }

      throw new Error('No expiration time in response');
    } catch (error) {
      console.error('Session refresh failed:', error);
      onRefreshError?.(error instanceof Error ? error : new Error('Refresh failed'));
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefreshSuccess, onRefreshError]);

  // Dismiss warning (user might want to continue working)
  const dismissWarning = useCallback(() => {
    setIsWarningVisible(false);
  }, []);

  // Proactively refresh the session before it expires, without requiring user interaction.
  // Falls back to the 30-second warning modal if the refresh fails.
  useEffect(() => {
    if (
      timeRemaining !== null &&
      timeRemaining > 0 &&
      timeRemaining <= PROACTIVE_REFRESH_THRESHOLD_SECONDS &&
      !isExpired &&
      !proactiveRefreshAttempted.current
    ) {
      proactiveRefreshAttempted.current = true;
      refreshSession();
    }
  }, [timeRemaining, isExpired, refreshSession]);

  // Check session status
  useEffect(() => {
    const checkSession = () => {
      const expiresAt = getExpirationTime();

      if (!expiresAt) {
        setTimeRemaining(null);
        setIsWarningVisible(false);
        return;
      }

      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

      setTimeRemaining(remaining);

      // Show warning when threshold is reached
      if (remaining <= WARNING_THRESHOLD_SECONDS && remaining > 0) {
        setIsWarningVisible(true);
      }

      // Handle expiration
      if (remaining === 0 && !expiredCallbackFired.current) {
        setIsExpired(true);
        setIsWarningVisible(false);
        expiredCallbackFired.current = true;
        onExpired?.();
      }
    };

    // Initial check
    checkSession();

    // Set up interval
    const intervalId = setInterval(checkSession, CHECK_INTERVAL_MS);

    // Listen for storage changes (multi-tab support)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SESSION_EXPIRES_KEY) {
        checkSession();
        // Reset expired state if session was refreshed in another tab
        if (event.newValue) {
          const newExpiresAt = parseInt(event.newValue, 10);
          if (Number.isFinite(newExpiresAt) && newExpiresAt > Date.now()) {
            setIsExpired(false);
            expiredCallbackFired.current = false;
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [getExpirationTime, onExpired]);

  return {
    timeRemaining,
    isWarningVisible,
    isExpired,
    refreshSession,
    dismissWarning,
  };
}
