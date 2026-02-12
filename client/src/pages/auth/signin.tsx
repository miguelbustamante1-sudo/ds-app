import { useEffect, useState } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/auth/auth-provider';
import { KeyRound } from 'lucide-react';

const enableDevLogin = import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true' || import.meta.env.DEV;

export function SignInPage() {
  const { user, loading, devLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname || '/';

  const [showDevLogin, setShowDevLogin] = useState(false);
  const [email, setEmail] = useState(import.meta.env.VITE_DEV_USERNAME || '');
  const [password, setPassword] = useState('');
  const [devError, setDevError] = useState('');
  const [devLoading, setDevLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [from, loading, navigate, user]);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devLogin) return;

    setDevError('');
    setDevLoading(true);

    try {
      const result = await devLogin(email, password);
      if (!result.success) {
        setDevError(result.error || 'Login failed');
      }
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-muted/40 via-background to-background px-4">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card/90 p-8 shadow-lg">
          <div className="flex flex-col items-center gap-4 text-center">
            <img
              src={toAbsoluteUrl('/media/app/telus_mini.png')}
              alt="Telus Digital"
              className="h-10"
            />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
              <p className="text-sm text-muted-foreground">
                Sign in to continue.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <Button
              className="w-full gap-3 bg-[#0073e6] hover:bg-[#005bb5] text-white"
              size="lg"
              onClick={() => window.location.href = '/api/auth/login'}
              disabled={loading}
            >
              <KeyRound className="h-5 w-5" />
              Sign in with OneLogin
            </Button>

            {enableDevLogin && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Development Only</span>
                  </div>
                </div>

                {!showDevLogin ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowDevLogin(true)}
                  >
                    Dev Login
                  </Button>
                ) : (
                  <form onSubmit={handleDevLogin} className="space-y-3">
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={devLoading}
                        required
                      />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={devLoading}
                        required
                      />
                    </div>
                    {devError && (
                      <p className="text-xs text-destructive text-center">{devError}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowDevLogin(false)}
                        disabled={devLoading}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1" disabled={devLoading}>
                        {devLoading ? 'Signing in...' : 'Sign In'}
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
  );
}
