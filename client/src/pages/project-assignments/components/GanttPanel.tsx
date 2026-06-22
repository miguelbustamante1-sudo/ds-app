import { useMemo, useState } from 'react';
import { parseUTCDateAsLocal, formatUTCDate } from '@/lib/utils';
import type { ProjectAssignmentWithDetailsDTO } from '@shared/dto';

interface GanttPanelProps {
  assignments: ProjectAssignmentWithDetailsDTO[];
  rowHeight: number;
}

interface TooltipState {
  assignment: ProjectAssignmentWithDetailsDTO;
  x: number;
  y: number;
}

export function GanttPanel({ assignments, rowHeight }: GanttPanelProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const [windowStart, windowEnd, monthLabels] = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 12, 0).getTime();
    const labels: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      labels.push(d.toLocaleString('en-US', { month: 'short', year: '2-digit' }));
    }
    return [start, end, labels];
  }, []);

  const totalMs = windowEnd - windowStart;

  function getBarPosition(a: ProjectAssignmentWithDetailsDTO) {
    const start = parseUTCDateAsLocal(a.projectAssignmentStartDate).getTime();
    const end = a.projectAssignmentEndDate
      ? parseUTCDateAsLocal(a.projectAssignmentEndDate).getTime()
      : windowEnd;
    const clampedStart = Math.max(start, windowStart);
    const clampedEnd = Math.min(end, windowEnd);
    if (clampedStart >= clampedEnd) return null;
    const leftPct = ((clampedStart - windowStart) / totalMs) * 100;
    const widthPct = ((clampedEnd - clampedStart) / totalMs) * 100;
    return { left: `${leftPct}%`, width: `${widthPct}%` };
  }

  if (assignments.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        No active assignments for this project.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Month header — matches left panel header height exactly */}
      <div style={{ height: rowHeight }} className="flex border-b bg-muted/50">
        {monthLabels.map((label, i) => (
          <div
            key={i}
            className="flex-1 flex items-center justify-center text-xs text-muted-foreground border-r last:border-r-0 font-medium"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Gantt rows — each row is exactly rowHeight pixels, pixel-perfect with left panel */}
      {assignments.map((a) => {
        const pos = getBarPosition(a);
        return (
          <div
            key={a.projectAssignmentId}
            style={{ height: rowHeight }}
            className="relative border-b flex items-center"
          >
            {/* Vertical grid lines aligned to month columns */}
            <div className="absolute inset-0 flex pointer-events-none">
              {monthLabels.map((_, i) => (
                <div key={i} className="flex-1 border-r last:border-r-0 border-border/40" />
              ))}
            </div>

            {/* Assignment bar */}
            {pos !== null && (
              <div
                className="absolute h-[60%] rounded-sm bg-primary flex items-center justify-center overflow-hidden cursor-default"
                style={pos}
                onMouseEnter={(e) => setTooltip({ assignment: a, x: e.clientX, y: e.clientY })}
                onMouseMove={(e) =>
                  setTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null))
                }
                onMouseLeave={() => setTooltip(null)}
                aria-label={`${a.teamMemberName ?? ''} assignment`}
              >
                <span className="text-[11px] text-primary-foreground font-normal truncate px-1 select-none">
                  {a.projectAssignmentAllocation != null ? `${a.projectAssignmentAllocation}%` : ''}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Hover tooltip */}
      {tooltip !== null && (
        <div
          className="fixed z-50 bg-popover text-popover-foreground border border-border shadow-md rounded-md p-3 text-xs pointer-events-none"
          style={{ top: tooltip.y + 14, left: tooltip.x + 14 }}
          role="tooltip"
        >
          <p className="font-semibold mb-1.5">{tooltip.assignment.teamMemberName}</p>
          <div className="space-y-0.5 text-muted-foreground">
            <p>
              Start:{' '}
              <span className="text-foreground">
                {formatUTCDate(tooltip.assignment.projectAssignmentStartDate)}
              </span>
            </p>
            <p>
              End:{' '}
              <span className="text-foreground">
                {tooltip.assignment.projectAssignmentEndDate
                  ? formatUTCDate(tooltip.assignment.projectAssignmentEndDate)
                  : 'Ongoing'}
              </span>
            </p>
            {tooltip.assignment.projectAssignmentBillRate !== null && (
              <p>
                Rate:{' '}
                <span className="text-foreground">
                  {tooltip.assignment.projectAssignmentBillRateCurrency ?? ''}{' '}
                  {tooltip.assignment.projectAssignmentBillRate}/hr
                </span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
