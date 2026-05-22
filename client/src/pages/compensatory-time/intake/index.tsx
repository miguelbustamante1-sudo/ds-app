import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { format, startOfDay, setHours, setMinutes } from 'date-fns';
import { CalendarIcon, Copy, Filter, Loader2, Plus, Trash2, X } from 'lucide-react';
import {
  ColumnDef,
  PaginationState,
  SortingState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ComboBox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPaginationLeftInfo } from '@/components/ui/data-grid-pagination-left-info';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/auth/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { createCompensatoryTime, deleteCompensatoryTime, getCompensatoryTimeBalance, getCompensatoryTimesAdmin, getCompensatoryTimesUser, getHoursPerShift } from '@/services/compensatoryTime';
import { Time } from '@internationalized/date';
import { DateInput, TimeField } from '@/components/ui/datefield';
import type { ProjectAssignmentWithDetailsDTO } from '@shared/dto';
import type { TeamMemberDTO } from '@shared/dto/TeamMember';
import type { CompensatoryTimeDTO } from '@shared/dto/CompensatoryTime';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntakeRow {
  id: number;
  projectId: string;
  subject: string;
  startDate: Date | undefined;
  startTime: string;
  endDate: Date | undefined;
  endTime: string;
  dayHours: number | undefined;
  nightHours: number | undefined;
  hoursLoading: boolean;
  hoursError: string | undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Parse a HH:MM string into { hours, minutes } - returns null if invalid
function parseTime(value: string): { hours: number; minutes: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { hours: h, minutes: min };
}

function timeFromString(value: string): Time | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return new Time(h, min);
}

function timeToString(t: Time | null): string {
  if (!t) return '';
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
}

function applyTime(date: Date, time: string): Date | null {
  const parsed = parseTime(time);
  if (!parsed) return null;
  return setMinutes(setHours(startOfDay(date), parsed.hours), parsed.minutes);
}

let nextId = 1;

const makeRow = (): IntakeRow => ({
  id: nextId++,
  projectId: '',
  subject: '',
  startDate: undefined,
  startTime: '',
  endDate: undefined,
  endTime: '',
  dayHours: undefined,
  nightHours: undefined,
  hoursLoading: false,
  hoursError: undefined,
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CompensatoryTimeIntakePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const teamMemberId = user?.teamMemberId;
  const isAdmin = user?.roles?.includes('admin') ?? false;
  const { toast } = useToast();

  const [rows, setRows] = useState<IntakeRow[]>([makeRow()]);
  const [projects, setProjects] = useState<{ projectId: number; projectName: string | null }[]>([]);
  const [teamMemberMap, setTeamMemberMap] = useState<Map<number, string>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  // Night multiplier from team member's country (for "Current Total Hours" column)
  const [nightMultiplier, setNightMultiplier] = useState<number>(1);
  const [nightStart, setNightStart] = useState<number | null>(null);
  const [nightEnd, setNightEnd] = useState<number | null>(null);

  // History list state
  // Admin uses server-side pagination; non-admin loads all own records client-side.
  const [history, setHistory] = useState<CompensatoryTimeDTO[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [adminTotal, setAdminTotal] = useState(0);
  const [adminPagination, setAdminPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });

  // Column search state (debounced, same pattern as approval-management)
  const [sorting, setSorting] = useState<SortingState>([]);

  const [showColumnSearch, setShowColumnSearch] = useState(false);
  const [columnSearches, setColumnSearches] = useState<Record<string, string>>({});
  const [debouncedSearches, setDebouncedSearches] = useState<Record<string, string>>({});
  const [searchPending, setSearchPending] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchPending(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearches(columnSearches);
      setSearchPending(false);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(columnSearches)]);

  // Summary state — derived from the current page's history to stay in sync with the table
  const summary = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const r of history) {
      if (r.status) counts[r.status] = (counts[r.status] ?? 0) + 1;
    }
    return counts;
  }, [history]);

  const hoursByStatus = useMemo<Record<string, number>>(() => {
    const hours: Record<string, number> = {};
    for (const r of history) {
      if (r.status) {
        const day = Number(r.dayHours ?? 0);
        const night = Number(r.nightHours ?? 0);
        const total = Math.round((day + night * nightMultiplier) * 100) / 100;
        hours[r.status] = Math.round(((hours[r.status] ?? 0) + total) * 100) / 100;
      }
    }
    return hours;
  }, [history, nightMultiplier]);

  useEffect(() => {
    if (teamMemberId !== undefined) {
      getCompensatoryTimeBalance(teamMemberId)
        .then((b) => {
          setNightMultiplier(b.nightMultiplier);
          setNightStart(b.nightStart);
          setNightEnd(b.nightEnd);
        })
        .catch(() => {});
    }
  }, [teamMemberId]);

  useEffect(() => {
    if (teamMemberId !== undefined) {
      apiGet<ProjectAssignmentWithDetailsDTO[]>(
        `/api/team-member-projects/team-member/${teamMemberId}?active=true`
      )
        .then((assignments) => {
          const unique = new Map<number, string | null>();
          for (const a of assignments) {
            if (a.projectId != null && !unique.has(a.projectId)) {
              unique.set(a.projectId, a.projectName ?? null);
            }
          }
          setProjects(Array.from(unique.entries()).map(([projectId, projectName]) => ({ projectId, projectName })));
        })
        .catch(() => {});
    }
    if (isAdmin) {
      apiGet<TeamMemberDTO[]>('/api/team-members')
        .then((members) =>
          setTeamMemberMap(new Map(members.map((m) => [m.teamMemberId, m.workdayId ?? String(m.teamMemberId)])))
        )
        .catch(() => {});
    }
  }, [teamMemberId, isAdmin]);

  const debouncedSearchesKey = JSON.stringify(debouncedSearches);
  const sortingKey = JSON.stringify(sorting);

  // Reset to page 0 when sort changes
  useEffect(() => {
    setAdminPagination((prev) => ({ ...prev, pageIndex: 0 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortingKey]);

  // Re-fetch whenever page, pageSize, column searches, or sort changes (server-side pagination)
  useEffect(() => {
    if (teamMemberId === undefined) return;
    setHistoryLoading(true);
    const sort = sorting.length > 0 ? { id: sorting[0].id, desc: sorting[0].desc } : undefined;
    const isUserOnly = (user?.roles ?? []).every((r) => r === 'user');
    const fetchFn = isAdmin && !isUserOnly
      ? getCompensatoryTimesAdmin(adminPagination.pageIndex + 1, adminPagination.pageSize, 'EARNED', undefined, debouncedSearches, sort)
      : getCompensatoryTimesUser(adminPagination.pageIndex + 1, adminPagination.pageSize, 'EARNED', undefined, debouncedSearches, sort, isUserOnly ? teamMemberId : undefined);
    fetchFn
      .then(({ data, total }) => {
        setHistory(data);
        setAdminTotal(total);
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMemberId, isAdmin, adminPagination.pageIndex, adminPagination.pageSize, debouncedSearchesKey, sortingKey]);

  const handleSave = async () => {
    const hasEmptyDescription = rows.some((r) => !r.subject.trim());
    if (hasEmptyDescription) {
      toast({ title: 'Validation error', description: 'Description is required for all rows.', variant: 'destructive' });
      return;
    }
    const validRows = rows.filter((r) => {
      if (!r.projectId || !r.startDate || !r.startTime || !r.endDate || !r.endTime) return false;
      const start = applyTime(r.startDate, r.startTime);
      const end   = applyTime(r.endDate,   r.endTime);
      if (!start || !end) return false;
      return end > start;
    });
    if (validRows.length === 0) {
      toast({ title: 'Nothing to save', description: 'Please fill in at least one complete row.', variant: 'destructive' });
      return;
    }
    if (!teamMemberId) {
      toast({ title: 'Error', description: 'No team member profile associated with your account.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const results = await Promise.all(
        validRows.map((r) => {
          const start = applyTime(r.startDate!, r.startTime)!;
          const end   = applyTime(r.endDate!,   r.endTime)!;
          return createCompensatoryTime({
            startingTime: format(start, "yyyy-MM-dd'T'HH:mm"),
            endingTime:   format(end,   "yyyy-MM-dd'T'HH:mm"),
            subject:      r.subject,
            teamMemberId: teamMemberId,
            projectId:    Number(r.projectId),
            dayHours:     r.dayHours   ?? 0,
            nightHours:   r.nightHours ?? 0,
          });
        }),
      );
      toast({ title: 'Saved', description: `${results.length} record(s) submitted successfully.` });
      nextId = 1;
      setRows([makeRow()]);
      setHistory((prev) => [...results.filter((r) => r.compType === 'EARNED'), ...prev]);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save records.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHistory = async (id: number) => {
    try {
      await deleteCompensatoryTime(id);
      setHistory((prev) => prev.filter((r) => r.compensatoryTimeId !== id));
      toast({ title: 'Deleted', description: 'Record deleted successfully.' });
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete record.',
        variant: 'destructive',
      });
    }
  };

  const addRow = () => setRows((prev) => [...prev, makeRow()]);

  const removeRow = (id: number) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const copyRow = (id: number) =>
    setRows((prev) => {
      const src = prev.find((r) => r.id === id);
      if (!src) return prev;
      const copy = { ...src, id: nextId++ };
      const idx = prev.findIndex((r) => r.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });

  const fetchHoursForRow = (row: IntakeRow) => {
    if (teamMemberId === undefined) return;
    if (!row.projectId || !row.startDate || !row.startTime || !row.endDate || !row.endTime) return;
    const start = applyTime(row.startDate, row.startTime);
    const end   = applyTime(row.endDate,   row.endTime);
    if (!start || !end) return;
    const rowId = row.id;
    if (end <= start) {
      setRows((prev) => prev.map((r) => r.id === rowId ? { ...r, hoursError: 'Ending time must be after Starting time', hoursLoading: false } : r));
      return;
    }
    const startingTime = format(start, "yyyy-MM-dd'T'HH:mm");
    const endingTime   = format(end,   "yyyy-MM-dd'T'HH:mm");
    setRows((prev) => prev.map((r) => r.id === rowId ? { ...r, hoursLoading: true, hoursError: undefined } : r));
    getHoursPerShift(teamMemberId, Number(row.projectId), startingTime, endingTime)
      .then(({ dayHours, nightHours }) => {
        setRows((prev) => prev.map((r) => r.id === rowId ? { ...r, dayHours, nightHours, hoursLoading: false, hoursError: undefined } : r));
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to calculate hours';
        setRows((prev) => prev.map((r) => r.id === rowId ? { ...r, hoursLoading: false, hoursError: message } : r));
      });
  };

  const updateRow = <K extends keyof IntakeRow>(id: number, key: K, value: IntakeRow[K]) => {
    const resetKeys: (keyof IntakeRow)[] = ['projectId', 'startDate', 'startTime', 'endDate', 'endTime'];
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [key]: value };
        if (resetKeys.includes(key)) {
          updated.dayHours     = undefined;
          updated.nightHours   = undefined;
          updated.hoursLoading = false;
          updated.hoursError   = undefined;
        }
        return updated;
      });

      // After state is queued, trigger hours fetch with the updated row
      if (resetKeys.includes(key)) {
        const updatedRow = next.find((r) => r.id === id);
        if (updatedRow) {
          // Defer so the setRows above can settle first
          setTimeout(() => fetchHoursForRow(updatedRow), 0);
        }
      }

      return next;
    });
  };

  // History table columns — mirrors /compensatory-time (no trash button)
  const historyColumns = useMemo<ColumnDef<CompensatoryTimeDTO>[]>(
    () => [
      {
        accessorKey: 'createdDate',
        enableSorting: true,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created Date" />,
        cell: ({ row }) =>
          row.original.createdDate
            ? format(new Date(String(row.original.createdDate)), 'dd-MMM-yyyy HH:mm')
            : '-',
        size: 160,
        meta: { headerTitle: 'Created Date', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'projectId',
        enableSorting: false,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Project" />,
        cell: ({ row }) => (
          <span className="whitespace-normal break-words">
            {row.original.projectId != null
              ? (projects.find((p) => p.projectId === row.original.projectId)?.projectName ?? String(row.original.projectId))
              : '-'}
          </span>
        ),
        size: 150,
        meta: { headerTitle: 'Project', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'subject',
        enableSorting: true,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Description" />,
        cell: ({ row }) => (
          <span className="whitespace-normal break-words">
            {row.original.subject ?? '-'}
          </span>
        ),
        size: 180,
        meta: { headerTitle: 'Description', skeleton: <Skeleton className="h-4 w-36" /> },
      },
      ...(isAdmin ? [{
        accessorKey: 'teamMemberId',
        enableSorting: false,
        header: ({ column }) => <DataGridColumnHeader column={column} title="WID" />,
        cell: ({ row }) =>
          teamMemberMap.get(row.original.teamMemberId) ?? String(row.original.teamMemberId),
        size: 130,
        meta: { headerTitle: 'WID', skeleton: <Skeleton className="h-4 w-24" /> },
      } as ColumnDef<CompensatoryTimeDTO>] : []),
      {
        accessorKey: 'compType',
        enableSorting: false,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => {
          const t = row.original.compType;
          return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '-';
        },
        size: 80,
        meta: { headerTitle: 'Type', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'status',
        enableSorting: true,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const s = row.original.status;
          return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '-';
        },
        size: 110,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'startingTime',
        enableSorting: true,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start" />,
        cell: ({ row }) =>
          row.original.startingTime
            ? format(new Date(String(row.original.startingTime)), 'dd-MMM-yyyy HH:mm')
            : '-',
        size: 160,
        meta: { headerTitle: 'Start', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'endingTime',
        enableSorting: true,
        header: ({ column }) => <DataGridColumnHeader column={column} title="End" />,
        cell: ({ row }) =>
          row.original.endingTime
            ? format(new Date(String(row.original.endingTime)), 'dd-MMM-yyyy HH:mm')
            : '-',
        size: 160,
        meta: { headerTitle: 'End', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'dayHours',
        enableSorting: true,
        header: ({ column }) => (
          <div className="text-right">
            <DataGridColumnHeader column={column} title="Day hours" />
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {row.original.dayHours != null ? String(row.original.dayHours) : '-'}
          </div>
        ),
        size: 105,
        meta: { headerTitle: 'Day hours', skeleton: <Skeleton className="h-4 w-10 ml-auto" /> },
      },
      {
        accessorKey: 'nightHours',
        enableSorting: true,
        header: ({ column }) => (
          <div className="text-right">
            <DataGridColumnHeader column={column} title="Night hours" />
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {row.original.nightHours != null ? String(row.original.nightHours) : '-'}
          </div>
        ),
        size: 115,
        meta: { headerTitle: 'Night hours', skeleton: <Skeleton className="h-4 w-10 ml-auto" /> },
      },
      {
        id: 'totalHours',
        header: ({ column }) => (
          <div className="text-right">
            <DataGridColumnHeader column={column} title="Current Total Hours ***" />
          </div>
        ),
        cell: ({ row }) => {
          const day   = Number(row.original.dayHours   ?? 0);
          const night = Number(row.original.nightHours ?? 0);
          const total = Math.round((day + night * nightMultiplier) * 100) / 100;
          return <div className="text-right font-medium">{total}</div>;
        },
        size: 145,
        meta: { headerTitle: 'Current Total Hours', skeleton: <Skeleton className="h-4 w-12 ml-auto" /> },
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => {
          const canDelete = row.original.status === 'SUBMITTED';
          return (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                title="Delete"
                disabled={!canDelete}
                onClick={() => handleDeleteHistory(row.original.compensatoryTimeId)}
              >
                <Trash2 size={15} />
              </Button>
            </div>
          );
        },
        size: 50,
        meta: { headerTitle: '', skeleton: <Skeleton className="h-4 w-6 ml-auto" /> },
      },
    ],
    [projects, teamMemberMap, isAdmin, nightMultiplier],
  );

  const hasColumnSearches = Object.values(columnSearches).some(Boolean);

  const historyTable = useReactTable({
    data: history,
    columns: historyColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: Math.ceil(adminTotal / adminPagination.pageSize),
    state: { pagination: adminPagination, sorting },
    onPaginationChange: setAdminPagination,
    onSortingChange: setSorting,
  });

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Compensatory Time - Intake</ToolbarPageTitle>
          <ToolbarDescription>Enter new compensatory time records</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={() => navigate('/compensatory-time')}>
            Back
          </Button>
        </ToolbarActions>
      </Toolbar>

      {/* New row button above table */}
      <div className="mt-2 flex justify-end mb-2">
        <Button variant="outline" onClick={addRow}>
          <Plus size={16} className="me-1" />
          New row
        </Button>
      </div>

      {/* Intake table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-center font-medium w-12">#</th>
              <th className="px-3 py-2 text-left font-medium w-56">Project <span className="text-muted-foreground">*</span></th>
              <th className="px-3 py-2 text-left font-medium w-72">Description <span className="text-muted-foreground">*</span></th>
              <th className="px-3 py-2 text-left font-medium">Start (24h time format) <span className="text-muted-foreground">*</span></th>
              <th className="px-3 py-2 text-left font-medium">End (24h time format) <span className="text-muted-foreground">*</span></th>
              <th className="px-3 py-2 text-right font-medium w-20">Day hours</th>
              <th className="px-3 py-2 text-right font-medium w-24">Night hours <span className="text-muted-foreground">**</span></th>
              <th className="px-3 py-2 w-20" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <React.Fragment key={row.id}>
                <tr className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 text-center text-muted-foreground">{idx + 1}</td>

                  <td className="px-3 py-2">
                    <ComboBox
                      value={row.projectId}
                      onValueChange={(v) => updateRow(row.id, 'projectId', v)}
                      options={projects.map((p) => ({
                        value: String(p.projectId),
                        label: p.projectName ?? String(p.projectId),
                      }))}
                      placeholder="Select project"
                      searchPlaceholder="Search project..."
                      emptyMessage="No projects found."
                      className="h-8 text-sm"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.subject}
                      onChange={(e) => updateRow(row.id, 'subject', e.target.value)}
                      placeholder="Description"
                      className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              'h-8 w-24 justify-start font-normal',
                              !row.startDate && 'text-muted-foreground',
                            )}
                          >
                            <CalendarIcon size={14} className="me-1 shrink-0" />
                            {row.startDate ? format(row.startDate, 'MM/dd') : 'MM/DD'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={row.startDate}
                            onSelect={(date) => updateRow(row.id, 'startDate', date)}
                          />
                        </PopoverContent>
                      </Popover>

                      <TimeField
                        value={timeFromString(row.startTime)}
                        onChange={(t) => updateRow(row.id, 'startTime', timeToString(t))}
                        hourCycle={24}
                        granularity="minute"
                      >
                        <DateInput />
                      </TimeField>
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              'h-8 w-24 justify-start font-normal',
                              !row.endDate && 'text-muted-foreground',
                            )}
                          >
                            <CalendarIcon size={14} className="me-1 shrink-0" />
                            {row.endDate ? format(row.endDate, 'MM/dd') : 'MM/DD'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={row.endDate}
                            onSelect={(date) => updateRow(row.id, 'endDate', date)}
                            disabled={row.startDate ? { before: row.startDate } : undefined}
                          />
                        </PopoverContent>
                      </Popover>

                      <TimeField
                        value={timeFromString(row.endTime)}
                        onChange={(t) => updateRow(row.id, 'endTime', timeToString(t))}
                        hourCycle={24}
                        granularity="minute"
                      >
                        <DateInput />
                      </TimeField>
                    </div>
                  </td>

                  <td className="px-3 py-2 text-right">
                    <span className="inline-flex h-8 w-16 items-center justify-end rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                      {row.hoursLoading ? '...' : row.dayHours !== undefined ? String(row.dayHours) : '-'}
                    </span>
                  </td>

                  <td className="px-3 py-2 text-right">
                    <span className="inline-flex h-8 w-16 items-center justify-end rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                      {row.hoursLoading ? '...' : row.nightHours !== undefined ? String(row.nightHours) : '-'}
                    </span>
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Copy row"
                        onClick={() => copyRow(row.id)}
                      >
                        <Copy size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        title="Remove row"
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
                {row.hoursError && (
                  <tr className="bg-destructive/5">
                    <td />
                    <td colSpan={7} className="px-3 pb-2 text-xs text-destructive">
                      {row.hoursError}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save button */}
      <div className="mt-3 flex items-center justify-end gap-4">
        <p className="text-xs text-muted-foreground">
          {nightStart !== null && nightEnd !== null && (
            <>
              ** Night hours according your country are{' '}
              {String(nightStart).padStart(2, '0')}:00-{String(nightEnd).padStart(2, '0')}:00.{' '}
            </>
          )}
          Fields marked with <span className="text-foreground font-medium">*</span> are required.
        </p>
        <Button onClick={handleSave} disabled={isSaving || rows.some((r) => r.hoursError !== undefined)}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Compensatory time history */}
      <h3 className="mt-8 mb-2 text-base font-semibold">
        {isAdmin ? 'All Members Compensatory Time' : 'My Compensatory Time'}
      </h3>

      {/* Column search toggle + panel */}
      <div className="mb-3 flex items-center gap-3">
        <Button
          variant={showColumnSearch || hasColumnSearches ? 'secondary' : 'outline'}
          onClick={() => setShowColumnSearch((v) => !v)}
          className="h-9 px-3 gap-1.5"
        >
          <Filter size={14} />
          Column search
          {hasColumnSearches && (
            <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 leading-none">
              {Object.values(columnSearches).filter(Boolean).length}
            </span>
          )}
        </Button>
      </div>

      {showColumnSearch && (
        <div className="mb-3 flex flex-wrap items-end gap-3 rounded-md border border-dashed px-4 py-3">
          {([
            { id: 'projectId', label: 'Project' },
            { id: 'subject', label: 'Description' },
            ...(isAdmin ? [{ id: 'teamMemberId', label: 'WID' }] : []),
          ] as { id: string; label: string }[]).map(({ id, label }) => {
            const hasValue = Boolean(columnSearches[id]);
            const isPending = searchPending && hasValue;
            return (
              <div key={id} className="flex flex-col gap-1 min-w-[160px]">
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <div className="relative">
                  <Input
                    placeholder={`Filter ${label.toLowerCase()}...`}
                    value={columnSearches[id] ?? ''}
                    onChange={(e) =>
                      setColumnSearches((prev) => ({ ...prev, [id]: e.target.value }))
                    }
                    className={`h-8 pr-7 text-sm${isPending ? ' border-amber-400 dark:border-amber-500' : ''}`}
                  />
                  {hasValue && (
                    isPending ? (
                      <Loader2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-amber-500" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setColumnSearches((prev) => ({ ...prev, [id]: '' }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X size={12} />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
          {hasColumnSearches && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setColumnSearches({})}
              className="h-8 self-end"
              disabled={searchPending}
            >
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Status summary badges */}
      {Object.keys(summary).length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {Object.entries(summary).map(([status, count]) => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm"
            >
              <span className="font-medium text-muted-foreground">{status}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {count} record{count !== 1 ? 's' : ''}
              </span>
              {hoursByStatus[status] !== undefined && (
                <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                  {Number(hoursByStatus[status].toFixed(2))} h
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[1600px]">
          <DataGridContainer>
            <DataGrid
              table={historyTable}
              recordCount={adminTotal}
              isLoading={historyLoading}
              emptyMessage="No compensatory time records found."
              tableLayout={{ width: 'fixed', columnsResizable: true, columnsMovable: true, columnsVisibility: true }}
            >
              <DataGridTable />
              <DataGridPaginationLeftInfo sizes={[25, 50, 100]} />
            </DataGrid>
          </DataGridContainer>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        *** Night hours multiplier according your country is <span className="text-foreground font-medium">{nightMultiplier}</span>.
      </p>
    </div>
  );
}