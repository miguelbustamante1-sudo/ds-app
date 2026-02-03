import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/auth-provider';
import { Loader2 } from 'lucide-react';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const exchangeAttempted = useRef(false);

  useEffect(() => {
    // Prevent double execution (React strict mode, etc.)
    if (exchangeAttempted.current) return;

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

    // Exchange code for tokens
    fetch('/api/auth/exchange-code', {
      method: 'POST',
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
        if (data.accessToken) {
          localStorage.setItem('auth_token', data.accessToken);
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
