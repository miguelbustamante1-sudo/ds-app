import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/auth-provider';
import { Loader2 } from 'lucide-react';

const SESSION_EXPIRES_KEY = 'session_expires_at';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const exchangeAttempted = useRef(false);

  useEffect(() => {
    // Prevent double execution (React strict mode, etc.)
    if (exchangeAttempted.current) return;

    // Check for tokens in URL hash (server-side callback flow - legacy fallback)
    // Hash format: #access_token=...&refresh_token=...&expires_in=...
    const hash = window.location.hash.substring(1);
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const expiresIn = hashParams.get('expires_in');

      if (expiresIn) {
        exchangeAttempted.current = true;
        // Store expiration time (NOT the token - tokens are now in httpOnly cookies)
        const expiresAt = Date.now() + parseInt(expiresIn, 10) * 1000;
        localStorage.setItem(SESSION_EXPIRES_KEY, String(expiresAt));
        // Clear hash from URL
        window.history.replaceState(null, '', window.location.pathname);
        refresh()
          .then(() => navigate('/', { replace: true }))
          .catch((err) => setError(err.message));
        return;
      }
    }

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setError(errorDescription || errorParam);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      return;
    }

    // Mark as attempted before async call
    exchangeAttempted.current = true;

    // Exchange code for tokens (frontend callback flow)
    // Tokens are set as httpOnly cookies by the backend
    fetch('/api/auth/exchange-code', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to exchange code');
        }
        return res.json();
      })
      .then((data) => {
        // Store expiration time (NOT the token)
        if (data.expiresAt) {
          localStorage.setItem(SESSION_EXPIRES_KEY, String(data.expiresAt));
        }
        return refresh();
      })
      .then(() => {
        navigate('/', { replace: true });
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [searchParams, navigate, refresh]);

  if (error) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive font-medium">Authentication failed</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <a href="/auth/signin" className="text-sm text-primary hover:underline">
            Return to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
