import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { CalendarIcon, Copy, Filter, Loader2, Plus, Trash2, X } from 'lucide-react';
import { format, startOfDay, setHours, setMinutes } from 'date-fns';
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
import { createCompensatoryTime, deleteCompensatoryTime, getCompensatoryTimeBalance, getCompensatoryTimesAdmin, getCompensatoryTimesUser, getShiftDetails, validateUsageRecord } from '@/services/compensatoryTime';
import type { CompensatoryTimeBalance } from '@/services/compensatoryTime';
import { Time } from '@internationalized/date';
import { DateInput, TimeField } from '@/components/ui/datefield';
import type { ProjectAssignmentWithDetailsDTO } from '@shared/dto';
import type { TeamMemberDTO } from '@shared/dto/TeamMember';
import type { CompensatoryTimeDTO } from '@shared/dto/CompensatoryTime';

interface UsageRow {
  id: number;
  projectId: string;
  subject: string;
  startDate: Date | undefined;
  startTime: string;
  endDate: Date | undefined;
  endTime: string;
  hoursError: string | undefined;
}

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
const makeRow = (): UsageRow => ({
  id: nextId++,
  projectId: '',
  subject: '',
  startDate: undefined,
  startTime: '',
  endDate: undefined,
  endTime: '',
  hoursError: undefined,
});

export function CompensatoryTimeUsagePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const teamMemberId = user?.teamMemberId;
  const { toast } = useToast();

  const isAdmin = user?.roles?.includes('admin') ?? false;

  const [rows, setRows] = useState<UsageRow[]>([makeRow()]);
  const [projects, setProjects] = useState<{ projectId: number; projectName: string | null }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [balance, setBalance] = useState<CompensatoryTimeBalance | null>(null);

  // History list state (USED records) — server-side pagination for both roles
  const [history, setHistory] = useState<CompensatoryTimeDTO[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPagination, setHistoryPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [teamMemberMap, setTeamMemberMap] = useState<Map<number, string>>(new Map());

  // Column search state (debounced, same pattern as approval-management)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

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

  // Shift hours per day-of-week (Sun=0..Sat=6)
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [weekHours, setWeekHours] = useState<Record<number, string>>({});
  const [weekHoursLoading, setWeekHoursLoading] = useState(false);

  const fetchBalance = () => {
    if (teamMemberId === undefined) return;
    getCompensatoryTimeBalance(teamMemberId)
      .then(setBalance)
      .catch(() => {});
  };

  useEffect(fetchBalance, [teamMemberId]);

  // Load team member WID map for admin WID column
  useEffect(() => {
    if (!isAdmin) return;
    apiGet<TeamMemberDTO[]>('/api/team-members')
      .then((members) =>
        setTeamMemberMap(new Map(members.map((m) => [m.teamMemberId, m.workdayId ?? String(m.teamMemberId)])))
      )
      .catch(() => {});
  }, [isAdmin]);

  const debouncedSearchesKey = JSON.stringify(debouncedSearches);
  const sortingKey = JSON.stringify(sorting);

  // Reset to page 0 when sort changes
  useEffect(() => {
    setHistoryPagination((prev) => ({ ...prev, pageIndex: 0 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortingKey]);

  // Re-fetch whenever page, pageSize, column searches, or sort changes (server-side pagination)
  useEffect(() => {
    if (teamMemberId === undefined) return;
    setHistoryLoading(true);
    const sort = sorting.length > 0 ? { id: sorting[0].id, desc: sorting[0].desc } : undefined;
    const isUserOnly = (user?.roles ?? []).every((r) => r === 'user');
    const fetchFn = isAdmin && !isUserOnly
      ? getCompensatoryTimesAdmin(historyPagination.pageIndex + 1, historyPagination.pageSize, 'USED', undefined, debouncedSearches, sort)
      : getCompensatoryTimesUser(historyPagination.pageIndex + 1, historyPagination.pageSize, 'USED', undefined, debouncedSearches, sort, isUserOnly ? teamMemberId : undefined);
    fetchFn
      .then(({ data, total }) => {
        setHistory(data);
        setHistoryTotal(total);
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMemberId, isAdmin, historyPagination.pageIndex, historyPagination.pageSize, debouncedSearchesKey, sortingKey, historyRefreshKey]);

  useEffect(() => {
    if (teamMemberId === undefined) return;
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
        const list = Array.from(unique.entries()).map(([projectId, projectName]) => ({ projectId, projectName }));
        setProjects(list);
        if (list.length > 0) setSelectedProjectId(String(list[0].projectId));
      })
      .catch(() => {});
  }, [teamMemberId]);

  useEffect(() => {
    if (!selectedProjectId || teamMemberId === undefined) return;
    setWeekHoursLoading(true);
    getShiftDetails(teamMemberId, Number(selectedProjectId))
      .then((details) => {
        const entries: Record<number, string> = {};
        for (const d of details) {
          entries[d.dayOfWeek] = d.workingHours > 0 ? String(d.workingHours) : '';
        }
        setWeekHours(entries);
      })
      .catch(() => {})
      .finally(() => setWeekHoursLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, teamMemberId]);

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

  const updateRow = <K extends keyof UsageRow>(id: number, key: K, value: UsageRow[K]) => {
    // Apply the field value immediately
    setRows((prev) => prev.map((r) => r.id !== id ? r : { ...r, [key]: value }));

    // Derive the new row state to decide whether to call the server
    setRows((prev) => {
      const row = prev.find((r) => r.id === id);
      if (!row) return prev;

      const startDate = key === 'startDate' ? (value as Date | undefined) : row.startDate;
      const startTime = key === 'startTime' ? (value as string) : row.startTime;
      const endDate   = key === 'endDate'   ? (value as Date | undefined) : row.endDate;
      const endTime   = key === 'endTime'   ? (value as string) : row.endTime;
      const projectId = key === 'projectId' ? (value as string) : row.projectId;

      // Only call the server when all required fields are present and parseable
      if (!startDate || !startTime || !endDate || !endTime || !projectId || !teamMemberId) return prev;
      const start = applyTime(startDate, startTime);
      const end   = applyTime(endDate, endTime);
      if (!start || !end) return prev;

      validateUsageRecord(
        teamMemberId,
        Number(projectId),
        format(start, "yyyy-MM-dd'T'HH:mm"),
        format(end,   "yyyy-MM-dd'T'HH:mm"),
      ).then((result) => {
        setRows((current) =>
          current.map((r) =>
            r.id === id
              ? { ...r, hoursError: result.valid ? undefined : result.error }
              : r,
          ),
        );
      }).catch(() => {});

      return prev;
    });
  };

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
        size: 135,
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
      {
        accessorKey: 'status',
        enableSorting: true,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const s = row.original.status;
          return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '-';
        },
        size: 90,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'rejectionReason',
        enableSorting: false,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Rejection Reason" />,
        cell: ({ row }) => {
          if (row.original.status !== 'REJECTED') return "-";
          const reason = row.original.rejectionReason;
          if (!reason) return "-";
          return <span className="whitespace-normal break-words">{reason}</span>;
        },
        size: 150,
        meta: { headerTitle: 'Rejection Reason', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'startingTime',
        enableSorting: true,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start" />,
        cell: ({ row }) =>
          row.original.startingTime
            ? format(new Date(String(row.original.startingTime)), 'dd-MMM-yyyy HH:mm')
            : '-',
        size: 130,
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
        size: 130,
        meta: { headerTitle: 'End', skeleton: <Skeleton className="h-4 w-32" /> },
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
        accessorKey: 'totalCreditedHours',
        enableSorting: true,
        header: ({ column }) => (
          <div className="text-right"><DataGridColumnHeader column={column} title="Hours" /></div>
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {row.original.totalCreditedHours != null ? String(row.original.totalCreditedHours) : '-'}
          </div>
        ),
        size: 90,
        meta: { headerTitle: 'Hours', skeleton: <Skeleton className="h-4 w-10 ml-auto" /> },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, teamMemberMap, isAdmin],
  );

  const hasColumnSearches = Object.values(columnSearches).some(Boolean);

  const usageHistoryTable = useReactTable({
    data: history,
    columns: historyColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: Math.ceil(historyTotal / historyPagination.pageSize),
    state: { pagination: historyPagination, sorting },
    onPaginationChange: setHistoryPagination,
    onSortingChange: setSorting,
  });

  const handleDeleteHistory = async (id: number) => {
    try {
      await deleteCompensatoryTime(id);
      setHistory((prev) => prev.filter((r) => r.compensatoryTimeId !== id));
      fetchBalance();
      toast({ title: 'Deleted', description: 'Record deleted successfully.' });
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete record.',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    const validRows = rows.filter((r) => {
      if (!r.projectId || !r.subject.trim() || !r.startDate || !r.startTime || !r.endDate || !r.endTime) return false;
      const start = applyTime(r.startDate, r.startTime);
      const end = applyTime(r.endDate, r.endTime);
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
          const end = applyTime(r.endDate!, r.endTime)!;
          const diffMs = end.getTime() - start.getTime();
          const totalCreditedHours = Math.round(diffMs / 3_600_000 * 100) / 100;
          return createCompensatoryTime({
            startingTime: format(start, "yyyy-MM-dd'T'HH:mm"),
            endingTime: format(end, "yyyy-MM-dd'T'HH:mm"),
            subject: r.subject,
            teamMemberId: teamMemberId,
            projectId: Number(r.projectId),
            dayHours: 0,
            nightHours: 0,
            totalCreditedHours,
            compType: 'USED',
          });
        }),
      );
      toast({ title: 'Saved', description: `${results.length} record(s) submitted successfully.` });
      nextId = 1;
      setRows([makeRow()]);
      fetchBalance();
      // Reset to first page and force a re-fetch via the refresh key
      setHistoryPagination((prev) => ({ ...prev, pageIndex: 0 }));
      setHistoryRefreshKey((k) => k + 1);
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

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Compensatory Time - Usage</ToolbarPageTitle>
          <ToolbarDescription>Enter compensatory time usage records</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={() => navigate('/compensatory-time')}>
            Back
          </Button>
        </ToolbarActions>
      </Toolbar>

      {balance !== null && (
        <div className="mt-6 flex flex-wrap items-stretch gap-4">
          <div className="rounded-lg border bg-muted/30 px-5 py-3 min-w-36 text-center">
            <p className="text-xs text-muted-foreground mb-1">Earned</p>
            <p className="text-xl font-semibold">{balance.earnedHours}</p>
            <p className="text-xs text-muted-foreground">hrs</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-5 py-3 min-w-36 text-center">
            <p className="text-xs text-muted-foreground mb-1">Used</p>
            <p className="text-xl font-semibold">{balance.usedHours}</p>
            <p className="text-xs text-muted-foreground">hrs</p>
          </div>
          <div className="rounded-lg border px-5 py-3 min-w-36 text-center" style={{ borderColor: balance.balanceHours >= 0 ? 'oklch(var(--success, 0.7 0.15 150))' : 'oklch(var(--destructive, 0.6 0.2 20))' }}>
            <p className="text-xs text-muted-foreground mb-1">Balance</p>
            <p className={`text-xl font-bold ${balance.balanceHours >= 0 ? 'text-green-600' : 'text-destructive'}`}>{balance.balanceHours}</p>
            <p className="text-xs text-muted-foreground">hrs</p>
          </div>
          <div className="w-px self-stretch bg-border" />
          <div className="rounded-lg border bg-muted/30 px-5 py-3 min-w-36 text-center">
            <p className="text-xs text-muted-foreground mb-1">Pending approve *</p>
            <p className="text-xl font-semibold">{balance.pendingHours}</p>
            <p className="text-xs text-muted-foreground">hrs</p>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        * Hours in Compensatory Time Usage requests pending of approval.
      </p>

      <div className="mt-2 flex justify-end mb-2">
        <Button variant="outline" onClick={addRow}>
          <Plus size={16} className="me-1" />
          New row
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-center font-medium w-12">#</th>
              <th className="px-3 py-2 text-left font-medium w-56">Project <span className="text-muted-foreground">**</span></th>
              <th className="px-3 py-2 text-left font-medium w-72">Description <span className="text-muted-foreground">**</span></th>
              <th className="px-3 py-2 text-left font-medium w-64">Start (24h time format) <span className="text-muted-foreground">**</span></th>
              <th className="px-3 py-2 text-left font-medium w-64">End (24h time format) <span className="text-muted-foreground">**</span></th>
              <th className="px-3 py-2 text-right font-medium w-20">Hours</th>
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
                            className={cn('h-8 w-24 justify-start font-normal', !row.startDate && 'text-muted-foreground')}
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
                            className={cn('h-8 w-24 justify-start font-normal', !row.endDate && 'text-muted-foreground')}
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

                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {(() => {
                      if (!row.startDate || !row.startTime || !row.endDate || !row.endTime) return '-';
                      const s = applyTime(row.startDate, row.startTime);
                      const e = applyTime(row.endDate, row.endTime);
                      if (!s || !e) return '-';
                      const diff = e.getTime() - s.getTime();
                      if (diff <= 0) return '-';
                      const decimal = Math.round(diff / 3_600_000 * 100) / 100;
                      return `${decimal}`;
                    })()}
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" title="Copy row" onClick={() => copyRow(row.id)}>
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
                    <td colSpan={6} className="px-3 pb-2 text-xs text-destructive">
                      {row.hoursError}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-end gap-4">
        <p className="text-xs text-muted-foreground">
          Fields marked with <span className="text-foreground font-medium">**</span> are required.
        </p>
        <Button onClick={handleSave} disabled={isSaving || rows.some((r) => r.hoursError !== undefined)}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* ---- My compensatory time usage history ---- */}
      <h3 className="mt-10 mb-2 text-base font-semibold">My Compensatory Time Usage</h3>

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

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <DataGridContainer>
            <DataGrid
              table={usageHistoryTable}
              recordCount={historyTotal}
              isLoading={historyLoading}
              emptyMessage="No compensatory time usage records found."
              tableLayout={{ width: 'fixed', columnsResizable: true, columnsMovable: true, columnsVisibility: true }}
            >
              <DataGridTable />
              <DataGridPaginationLeftInfo sizes={[25, 50, 100]} />
            </DataGrid>
          </DataGridContainer>
        </div>
      </div>

      {/* ---- Shift hours per day of week ---- */}
      <div className="mt-10">
        <h3 className="mb-1 text-base font-semibold">Shifts View</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          This section is informational purpose only. Read only. No action needed.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-56 shrink-0">
            <label className="mb-1.5 block text-sm font-medium">Project</label>
            <ComboBox
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              options={projects.map((p) => ({
                value: String(p.projectId),
                label: p.projectName ?? String(p.projectId),
              }))}
              placeholder="Select a project"
              searchPlaceholder="Search project..."
              emptyMessage="No projects found."
            />
          </div>

          {DAY_NAMES.map((name, dow) => (
            <div key={dow} className="flex flex-col items-center gap-1 w-14">
              <span className="text-xs font-medium text-muted-foreground">{name}</span>
              <span className="flex h-8 w-full items-center justify-center rounded-md border border-input bg-muted px-2 text-sm text-foreground">
                {weekHoursLoading ? '...' : (weekHours[dow] ?? '0')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
