import { useEffect } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/auth-provider';
import { KeyRound } from 'lucide-react';

export function SignInPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname || '/';

  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [from, loading, navigate, user]);

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
          </div>
        </div>
      </div>
  );
}
