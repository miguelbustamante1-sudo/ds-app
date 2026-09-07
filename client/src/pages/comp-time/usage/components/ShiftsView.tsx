import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { ComboBox } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';
import { getShiftDetails } from '@/services/compensatoryTime';
import type { ProjectOption } from '@/pages/comp-time/hooks/useActiveProjects';
import type { ShiftDetail } from '@/services/compensatoryTime';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface ShiftsViewProps {
  teamMemberId: number;
  projects: ProjectOption[];
}

export function ShiftsView({ teamMemberId, projects }: ShiftsViewProps) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [shifts, setShifts]                       = useState<ShiftDetail[]>([]);
  const [loading, setLoading]                     = useState(false);

  useEffect(() => {
    if (!selectedProjectId) {
      setShifts([]);
      return;
    }
    setLoading(true);
    getShiftDetails(teamMemberId, Number(selectedProjectId))
      .then(setShifts)
      .catch(() => setShifts([]))
      .finally(() => setLoading(false));
  }, [selectedProjectId, teamMemberId]);

  const shiftByDay = (dayOfWeek: number): number => {
    return shifts.find((s) => s.dayOfWeek === dayOfWeek)?.workingHours ?? 0;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <CardTitle className="flex items-center gap-2 mb-4">
          Shift Reference
        </CardTitle>

        <div className="mb-4 max-w-xs">
          <ComboBox
            options={projects}
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
            placeholder="Select a project to view shifts"
            searchPlaceholder="Search projects..."
            emptyMessage="No projects found."
          />
        </div>

        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : selectedProjectId ? (
          <div className="grid grid-cols-7 gap-2">
            {([0, 1, 2, 3, 4, 5, 6] as const).map((day) => (
              <div
                key={day}
                className="flex flex-col items-center rounded-md border bg-muted/40 p-3"
              >
                <span className="text-xs font-medium text-muted-foreground">{DAY_NAMES[day]}</span>
                <span className="mt-1 text-sm font-semibold">{shiftByDay(day).toFixed(1)}h</span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
