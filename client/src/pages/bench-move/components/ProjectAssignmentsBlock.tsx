import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatUTCDate } from '@/lib/utils';
import type { ProjectAssignmentWithDetailsDTO } from '@shared/dto';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface ProjectAssignmentsBlockProps {
  projects: ProjectAssignmentWithDetailsDTO[];
  endDates: Record<number, string>;
  onEndDateChange: (projectAssignmentId: number, date: string) => void;
}

export function ProjectAssignmentsBlock({
  projects,
  endDates,
  onEndDateChange,
}: ProjectAssignmentsBlockProps) {
  const defaultDate = todayISO();

  function isContinuing(endDate: string): boolean {
    return endDate > defaultDate;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Assignments</CardTitle>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active project assignments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Project Name</th>
                  <th className="pb-2 pr-4 font-medium">Client</th>
                  <th className="pb-2 pr-4 font-medium">Allocation</th>
                  <th className="pb-2 pr-4 font-medium">Start Date</th>
                  <th className="pb-2 font-medium">End Date</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const currentEndDate = endDates[p.projectAssignmentId] ?? defaultDate;
                  const stillActive = isContinuing(currentEndDate);

                  return (
                    <tr
                      key={p.projectAssignmentId}
                      className={`border-b last:border-0 ${stillActive ? 'bg-yellow-50' : ''}`}
                    >
                      <td className="py-2 pr-4">{p.projectName ?? '—'}</td>
                      <td className="py-2 pr-4">{p.clientName ?? '—'}</td>
                      <td className="py-2 pr-4">
                        {p.projectAssignmentAllocation != null
                          ? `${p.projectAssignmentAllocation}%`
                          : '—'}
                      </td>
                      <td className="py-2 pr-4">
                        {p.projectAssignmentStartDate
                          ? formatUTCDate(p.projectAssignmentStartDate)
                          : '—'}
                      </td>
                      <td className="py-2">
                        <Input
                          type="date"
                          value={currentEndDate}
                          onChange={(e) =>
                            onEndDateChange(p.projectAssignmentId, e.target.value)
                          }
                          className="w-36"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
