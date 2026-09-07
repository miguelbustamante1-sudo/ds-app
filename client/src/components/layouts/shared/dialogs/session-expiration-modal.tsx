import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface SessionExpirationModalProps {
  open: boolean;
  timeRemaining: number | null;
  onRefresh: () => Promise<boolean>;
  onLogout: () => void;
}

export function SessionExpirationModal({
  open,
  timeRemaining,
  onRefresh,
  onLogout,
}: SessionExpirationModalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const success = await onRefresh();
      if (!success) {
        setError('Failed to refresh session. Please try again or log out.');
      }
    } catch (err) {
      setError('An error occurred while refreshing your session.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    setError(null);
    onLogout();
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Your session will expire in{' '}
              <span className="font-semibold text-foreground">
                {timeRemaining !== null ? `${timeRemaining} seconds` : 'a moment'}
              </span>
              .
            </p>
            <p>Would you like to continue your session?</p>
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isRefreshing}
          >
            Logout Now
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Continue Session'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
