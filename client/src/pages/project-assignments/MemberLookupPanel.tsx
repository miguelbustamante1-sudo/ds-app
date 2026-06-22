import { useEffect, useState } from 'react';
import type { ProjectAssignmentWithDetailsDTO } from '@shared/dto';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import { TeamMemberComboBox } from './components/TeamMemberComboBox';

export function MemberLookupPanel() {
  const [selectedTmId, setSelectedTmId] = useState('');
  const [assignments, setAssignments] = useState<ProjectAssignmentWithDetailsDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedTmId) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    apiGet<ProjectAssignmentWithDetailsDTO[]>(
      `/api/team-member-projects/team-member/${selectedTmId}?active=true`,
    )
      .then(setAssignments)
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, [selectedTmId]);

  return (
    <div>
      <p className="text-sm font-semibold mb-1">Member Lookup</p>
      <p className="text-xs text-muted-foreground mb-4">
        Search a team member to see their current project allocations as a reference.
      </p>

      <div className="max-w-sm">
        <Label>Team Member</Label>
        <TeamMemberComboBox value={selectedTmId} onValueChange={setSelectedTmId} />
      </div>

      {selectedTmId && (
        <Card className="mt-4 max-w-xl">
          <CardContent className="pt-4">
            {loading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            )}

            {!loading && assignments.length === 0 && (
              <p className="text-sm text-muted-foreground">No active assignments found.</p>
            )}

            {!loading && assignments.length > 0 && (
              <div className="divide-y">
                {assignments.map((a) => (
                  <div
                    key={a.projectAssignmentId}
                    className="py-2 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{a.projectName ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatUTCDate(a.projectAssignmentStartDate)}
                        {' → '}
                        {a.projectAssignmentEndDate
                          ? formatUTCDate(a.projectAssignmentEndDate)
                          : 'ongoing'}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {a.projectAssignmentAllocation != null
                        ? `${a.projectAssignmentAllocation}%`
                        : '—'}
                    </span>
                    <span className="text-sm text-muted-foreground shrink-0 w-24 text-right">
                      {a.projectAssignmentBillRate != null
                        ? `${a.projectAssignmentBillRateCurrency ?? ''} ${a.projectAssignmentBillRate}`
                        : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
