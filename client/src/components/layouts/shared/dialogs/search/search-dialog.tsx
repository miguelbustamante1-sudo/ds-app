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
import { useMyTeamMembers } from '@/hooks/useSupervisorTimeOff';
import { SearchEmpty, SearchNoResults } from './';

export function SearchDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();
  const { teamMembers, loading, loadTeamMembers } = useMyTeamMembers();

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && teamMembers.length === 0) {
      loadTeamMembers();
    }
    if (!isOpen) {
      setSearchInput('');
    }
  }

  const query = searchInput.trim().toLowerCase();

  const filtered = query
    ? teamMembers.filter((m) => {
        const haystack =
          `${m.teamMemberNames} ${m.teamMemberSurnames} ${m.workdayId ?? ''}`.toLowerCase();
        return haystack.includes(query);
      })
    : [];

  function handleSelect(teamMemberId: number) {
    setOpen(false);
    navigate(`/my-team/${teamMemberId}`);
  }

  function getInitials(names: string, surnames: string) {
    return `${names.charAt(0)}${surnames.charAt(0)}`.toUpperCase();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="lg:max-w-[600px] lg:top-[15%] lg:translate-y-0 p-0 [&_[data-slot=dialog-close]]:top-5.5 [&_[data-slot=dialog-close]]:end-5.5">
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
              placeholder="Search team members by name or WDID..."
              autoComplete="off"
            />
          </div>
        </DialogHeader>
        <DialogBody className="p-0 pb-5">
          <ScrollArea className="h-[480px]">
            {loading && (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                Loading...
              </div>
            )}

            {!loading && !query && <SearchEmpty />}

            {!loading && query && filtered.length === 0 && <SearchNoResults />}

            {!loading && filtered.length > 0 && (
              <div className="grid gap-1 p-2">
                {filtered.map((member) => (
                  <Button
                    key={member.teamMemberId}
                    variant="ghost"
                    className="w-full justify-start h-auto py-2 px-3"
                    onClick={() => handleSelect(member.teamMemberId)}
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
                          {member.workdayId && member.primaryRoleName && ' · '}
                          {member.primaryRoleName}
                        </span>
                      </div>
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">
                        {member.reportType}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
