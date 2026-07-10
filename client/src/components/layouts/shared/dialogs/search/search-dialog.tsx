import { ReactNode, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/auth/auth-provider';
import { apiGet } from '@/lib/api';
import { MENU_SIDEBAR } from '@/config/layout-1.config';
import type { TeamMemberDTO } from '@shared/dto';
import { SearchEmpty, SearchNoResults } from './';

export function SearchDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMemberDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { canRead } = usePermissions();
  const { user } = useAuth();

  async function loadTeamMembers() {
    if (teamMembers.length > 0) return;
    setLoading(true);
    try {
      const data = await apiGet<TeamMemberDTO[]>('/api/team-members');
      setTeamMembers(data);
    } catch {
      // search will simply show no team member results
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) loadTeamMembers();
    if (!isOpen) setSearchInput('');
  }

  const query = searchInput.trim().toLowerCase();

  const filteredMembers = query
    ? teamMembers.filter((m: TeamMemberDTO) => {
        const haystack =
          `${m.teamMemberNames} ${m.teamMemberSurnames} ${m.teamMemberKnownAs ?? ''} ${m.workdayId ?? ''}`.toLowerCase();
        return haystack.includes(query);
      })
    : [];

  const filteredModules = query
    ? MENU_SIDEBAR.filter((item) => {
        if (!item.title?.toLowerCase().includes(query)) return false;
        if (item.role) {
          const required = Array.isArray(item.role) ? item.role : [item.role];
          if (!required.some((r) => user?.roles.includes(r))) return false;
        }
        if (item.permission) {
          const required = Array.isArray(item.permission) ? item.permission : [item.permission];
          if (!required.some((p) => canRead(p))) return false;
        }
        return !!item.path;
      })
    : [];

  function handleSelectMember(teamMemberId: number) {
    setOpen(false);
    navigate(`/my-team/${teamMemberId}`);
  }

  function handleSelectModule(path: string) {
    setOpen(false);
    navigate(path);
  }

  function getInitials(names: string, surnames: string) {
    return `${names.charAt(0)}${surnames.charAt(0)}`.toUpperCase();
  }

  const hasResults = filteredMembers.length > 0 || filteredModules.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl lg:top-[15%] lg:translate-y-0 p-0 [&_[data-slot=dialog-close]]:top-5.5 [&_[data-slot=dialog-close]]:end-5.5">
        <DialogHeader className="px-4 py-1 mb-1">
          <DialogTitle></DialogTitle>
          <DialogDescription></DialogDescription>
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 size-4" />
            <Input
              type="text"
              name="query"
              value={searchInput}
              className="ps-6 outline-none! ring-0! shadow-none! border-0"
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search team members or modules..."
              autoComplete="off"
            />
          </div>
        </DialogHeader>
        <DialogBody className="p-0 pb-5">
          <ScrollArea className="max-h-[70vh]">
            {loading && (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                Loading...
              </div>
            )}

            {!loading && !query && <SearchEmpty />}

            {!loading && query && !hasResults && <SearchNoResults />}

            {!loading && hasResults && (
              <div className="grid gap-1 p-2">
                {filteredModules.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Modules
                    </div>
                    {filteredModules.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Button
                          key={item.path}
                          variant="ghost"
                          className="w-full justify-start h-auto py-2 px-3"
                          onClick={() => handleSelectModule(item.path!)}
                        >
                          <div className="flex items-center gap-3 w-full">
                            {Icon && (
                              <div className="flex items-center justify-center size-9 rounded-full bg-muted shrink-0">
                                <Icon className="size-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-sm font-medium">{item.title}</span>
                          </div>
                        </Button>
                      );
                    })}
                  </>
                )}

                {filteredMembers.length > 0 && (
                  <>
                    {filteredModules.length > 0 && <div className="mx-3 my-1 border-t" />}
                    <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Team Members
                    </div>
                    {filteredMembers.map((member) => (
                      <Button
                        key={member.teamMemberId}
                        variant="ghost"
                        className="w-full justify-start h-auto py-2 px-3"
                        onClick={() => handleSelectMember(member.teamMemberId)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="flex items-center justify-center size-9 rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                            {getInitials(member.teamMemberNames, member.teamMemberSurnames)}
                          </div>
                          <div className="flex flex-col items-start min-w-0">
                            <span className="text-sm font-semibold text-mono truncate">
                              {member.teamMemberNames} {member.teamMemberSurnames}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {member.workdayId && (
                                <span className="font-mono">{member.workdayId}</span>
                              )}
                              {member.workdayId && member.roleName && ' · '}
                              {member.roleName}
                            </span>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
