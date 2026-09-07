import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import type { UserDTO, AuthUserDetailDTO, SecurityRoleDTO } from '@shared/dto';
import { apiGet } from '@/lib/api';
import { getAuthUserByDsUser, getRoles } from '@/services/security';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { SectionA } from './SectionA';
import { SectionB } from './SectionB';

export function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canRead } = usePermissions();
  const { toast } = useToast();

  const [user, setUser] = useState<UserDTO | null>(null);
  const [authUser, setAuthUser] = useState<AuthUserDetailDTO | null>(null);
  const [availableRoles, setAvailableRoles] = useState<SecurityRoleDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dsUserId = Number(id);
    if (!id || Number.isNaN(dsUserId)) {
      navigate('/maintenance/users');
      return;
    }

    const load = async () => {
      try {
        const [dsUser, auth, roles] = await Promise.all([
          apiGet<UserDTO>(`/api/users/${dsUserId}`),
          getAuthUserByDsUser(dsUserId),
          getRoles(),
        ]);
        setUser(dsUser);
        setAuthUser(auth);
        setAvailableRoles(roles);
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load user data',
          variant: 'destructive',
        });
        navigate('/maintenance/users');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, navigate, toast]);

  if (!canRead('Users')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/maintenance/users')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <ToolbarPageTitle>
                {loading ? 'Loading...' : `Edit User — ${user?.userName ?? ''}`}
              </ToolbarPageTitle>
              <ToolbarDescription>
                Manage DS user record and security roles
              </ToolbarDescription>
            </div>
          </div>
        </ToolbarHeading>
      </Toolbar>

      {loading ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : user ? (
        <div className="mt-6 space-y-6">
          <SectionA user={user} onSaved={setUser} />
          {authUser ? (
            <SectionB
              authUser={authUser}
              availableRoles={availableRoles}
              onSaved={setAuthUser}
            />
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
              No authentication record found for this user. The user has not logged in via
              OneLogin yet.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
