import { ReactNode } from 'react';
import { Moon, UserCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link } from 'react-router';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/auth/auth-provider';
import { PermissionGate } from '@/components/PermissionGate';

export function UserDropdownMenu({ trigger }: { trigger: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const avatar = user?.avatarUrl || toAbsoluteUrl('/media/avatars/blank.png');
  const displayName = user?.name || 'User';
  const email = user?.email || 'user@example.com';

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" side="bottom" align="end">
        {/* Header */}
        <div className="flex items-center gap-2 p-3">
          <img
            className="size-9 rounded-full border-2 border-green-500"
            src={avatar}
            alt="User avatar"
          />
          <div className="flex flex-col">
            <span className="text-sm text-mono font-semibold">{displayName}</span>
            <a
              href={`mailto:${email}`}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              {email}
            </a>
          </div>
        </div>

        <DropdownMenuSeparator />

        <PermissionGate resource="MyProfile">
          <DropdownMenuItem asChild>
            <Link to="/my-profile" className="flex items-center gap-2">
              <UserCircle />
              My Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </PermissionGate>

        <DropdownMenuItem
          className="flex items-center gap-2"
          onSelect={(event) => event.preventDefault()}
        >
          <Moon />
          <div className="flex items-center gap-2 justify-between grow">
            Dark Mode
            <Switch
              size="sm"
              checked={theme === 'dark'}
              onCheckedChange={handleThemeToggle}
            />
          </div>
        </DropdownMenuItem>
        <div className="p-2 mt-1">
          <Button variant="outline" size="sm" className="w-full" onClick={logout}>
            Logout
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
