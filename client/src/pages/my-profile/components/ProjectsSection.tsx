import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, Building2, User } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
import type { TeamMemberReportProjectDTO } from '@shared/dto/TeamMemberReport';

interface ProjectsSectionProps {
  projects: TeamMemberReportProjectDTO[];
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  const totalAllocation = projects.reduce(
    (sum, p) => sum + p.projectAssignmentAllocation,
    0,
  );

  return (
    <Card className="md:col-span-2 lg:col-span-4">
      <CardContent>
        <CardTitle className="flex items-center gap-2 mb-4">
          <FolderKanban className="h-4 w-4" />
          Current Projects
        </CardTitle>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active project assignments.</p>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.projectId}
                className="rounded-lg border p-4 space-y-3"
              >
                {/* Name + allocation */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{project.projectName}</span>
                  <Badge variant="outline" className="shrink-0">
                    {project.projectAssignmentAllocation}%
                  </Badge>
                </div>

                {/* Allocation bar */}
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(project.projectAssignmentAllocation, 100)}%` }}
                  />
                </div>

                {/* Client + contacts */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {project.clientName && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {project.clientName}
                    </span>
                  )}
                  {project.clientContacts.length > 0 && (
                    <span className="flex items-center gap-1 flex-wrap">
                      <User className="h-3 w-3 shrink-0" />
                      {project.clientContacts.join(' · ')}
                    </span>
                  )}
                </div>

                {/* Dates */}
                <div className="text-xs text-muted-foreground">
                  {project.projectAssignmentStartDate
                    ? formatUTCDate(project.projectAssignmentStartDate)
                    : '—'}
                  {' → '}
                  {project.projectAssignmentEndDate
                    ? formatUTCDate(project.projectAssignmentEndDate)
                    : 'Ongoing'}
                </div>
              </div>
            ))}

            {/* Total allocation footer */}
            <div className="flex justify-end pt-1">
              <span className="text-xs text-muted-foreground">
                Total allocation:{' '}
                <span className="font-medium text-foreground">{totalAllocation}%</span>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
