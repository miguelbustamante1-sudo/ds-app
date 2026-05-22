import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Filter, Loader2, ListChecks, RefreshCw, X } from 'lucide-react';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import type { CompensatoryTimeDTO } from '@shared/dto/CompensatoryTime';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPaginationLeftInfo } from '@/components/ui/data-grid-pagination-left-info';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/auth/auth-provider';
import { getCompensatoryTimesBySupervisorPaginated, getMaxReportLevelBySupervisor, updateCompensatoryTimeStatus } from '@/services/compensatoryTime';

export function ApprovalManagementPage() {
  const [records, setRecords] = useState<CompensatoryTimeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    { id: 'status', value: ['SUBMITTED'] },
    { id: 'reportLevel', value: ['1'] },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({ reportLevel: false });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkConfirm, setBulkConfirm] = useState<{ status: string; label: string; count: number } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [total, setTotal] = useState(0);
  const [maxHierarchyDepth, setMaxHierarchyDepth] = useState(0);
  const { toast } = useToast();
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [showColumnSearch, setShowColumnSearch] = useState(false);
  const [columnSearches, setColumnSearches] = useState<Record<string, string>>({});
  const [debouncedSearches, setDebouncedSearches] = useState<Record<string, string>>({});
  const [searchPending, setSearchPending] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { canRead } = usePermissions();
  const { user } = useAuth();
  const isUserRole = user?.roles?.includes('user') ?? false;

  useEffect(() => {
    if (user?.teamMemberId === undefined) return;
    getMaxReportLevelBySupervisor(user.teamMemberId)
      .then((depth) => setMaxHierarchyDepth(depth))
      .catch(() => setMaxHierarchyDepth(0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.teamMemberId]);

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

  const loadData = async (page: number, pageSize: number, statuses?: string[], reportLevels?: number[], searches?: Record<string, string>, sort?: { id: string; desc: boolean }) => {
    setLoading(true);
    try {
      if (user?.teamMemberId === undefined) {
        setRecords([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      const { data, total: t } = await getCompensatoryTimesBySupervisorPaginated(
        user.teamMemberId,
        page + 1,
        pageSize,
        statuses,
        user.teamMemberId,
        undefined,
        reportLevels,
        searches,
        sort,
      );
      setRecords(data);
      setTotal(t);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load compensatory time records',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openBulkConfirm = (status: string, label: string) => {
    const count = Object.values(rowSelection).filter(Boolean).length;
    if (count === 0) return;
    setBulkConfirm({ status, label, count });
  };

  const handleBulkStatusChange = async () => {
    if (!bulkConfirm) return;
    const { status } = bulkConfirm;
    const selectedRows = Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((k) => records[Number(k)])
      .filter(Boolean);
    const reasonToSend = status === 'REJECTED' ? rejectionReason : undefined;
    setBulkConfirm(null);
    setRejectionReason('');
    if (selectedRows.length === 0) return;
    setIsBulkUpdating(true);
    try {
      const updated = await Promise.all(
        selectedRows.map((r) => updateCompensatoryTimeStatus(r.compensatoryTimeId, status, reasonToSend)),
      );
      const updatedMap = new Map(updated.map((u) => [u.compensatoryTimeId, u]));
      setRecords((prev) =>
        prev.map((r) => {
          const patched = updatedMap.get(r.compensatoryTimeId);
          return patched ? { ...patched, reportLevel: r.reportLevel } : r;
        }),
      );
      setRowSelection({});
      toast({
        title: 'Status updated',
        description: `${updated.length} record(s) changed to ${status.charAt(0) + status.slice(1).toLowerCase()}.`,
      });
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const statusFilterValue = columnFilters.find((f) => f.id === 'status')?.value;
  const statusFilterKey = JSON.stringify(statusFilterValue);

  const reportLevelFilterValue = columnFilters.find((f) => f.id === 'reportLevel')?.value;
  const reportLevelFilterKey = JSON.stringify(reportLevelFilterValue);

  const paginationKey = `${pagination.pageIndex}:${pagination.pageSize}`;

  const debouncedSearchesKey = JSON.stringify(debouncedSearches);

  const sortingKey = JSON.stringify(sorting);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setRowSelection({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortingKey]);

  useEffect(() => {
    const statuses = Array.isArray(statusFilterValue) && (statusFilterValue as string[]).length > 0
      ? (statusFilterValue as string[])
      : undefined;
    const reportLevels = Array.isArray(reportLevelFilterValue) && (reportLevelFilterValue as string[]).length > 0
      ? (reportLevelFilterValue as string[]).map((v) => parseInt(v, 10)).filter((n) => !isNaN(n))
      : undefined;
    const sort = sorting.length > 0 ? { id: sorting[0].id, desc: sorting[0].desc } : undefined;
    loadData(pagination.pageIndex, pagination.pageSize, statuses, reportLevels, debouncedSearches, sort);
    setRowSelection({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilterKey, reportLevelFilterKey, paginationKey, debouncedSearchesKey, sortingKey, user?.teamMemberId]);

  const columns = useMemo<ColumnDef<CompensatoryTimeDTO>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => {
          const selectableRows = table.getRowModel().rows.filter(
            (r) => !(isUserRole && (r.original.reportLevel ?? 0) > 1)
          );
          const allSelectableSelected =
            selectableRows.length > 0 && selectableRows.every((r) => r.getIsSelected());
          const someSelectableSelected =
            selectableRows.some((r) => r.getIsSelected()) && !allSelectableSelected;
          return (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelectableSelected ? true : someSelectableSelected ? 'indeterminate' : false}
                onCheckedChange={(value) => {
                  selectableRows.forEach((r) => r.toggleSelected(!!value));
                }}
                aria-label="Select all"
              />
              <span className="text-xs font-medium leading-tight">Select<br />All</span>
            </div>
          );
        },
        cell: ({ row }) => {
          const disabledByRole = isUserRole && (row.original.reportLevel ?? 0) > 1;
          return (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
              disabled={disabledByRole}
              className={disabledByRole ? 'bg-gray-400 border-gray-500 dark:bg-gray-500 dark:border-gray-400 opacity-100' : ''}
            />
          );
        },
        size: 90,
        enableSorting: false,
        enableHiding: false,
        meta: { headerClassName: 'w-10', skeleton: <Skeleton className="h-4 w-4" /> },
      },
      {
        accessorKey: 'createdDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created Date" />,
        cell: ({ row }) =>
          row.original.createdDate
            ? format(new Date(String(row.original.createdDate)), 'dd-MMM-yyyy HH:mm')
            : '-',
        size: 135,
        enableSorting: true,
        meta: { headerTitle: 'Created Date', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'projectId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Project" />,
        cell: ({ row }) => (
          <span className="whitespace-normal break-words">
            {row.original.projectName ?? (row.original.projectId != null ? String(row.original.projectId) : '-')}
          </span>
        ),
        size: 150,
        enableSorting: false,
        meta: { headerTitle: 'Project', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'subject',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Description" />,
        cell: ({ row }) => (
          <span className="whitespace-normal break-words">
            {row.original.subject ?? '-'}
          </span>
        ),
        size: 180,
        enableSorting: true,
        meta: { headerTitle: 'Description', skeleton: <Skeleton className="h-4 w-36" /> },
      },
      {
        accessorKey: 'teamMemberId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Team Member" />,
        cell: ({ row }) =>
          row.original.teamMemberName ?? String(row.original.teamMemberId),
        size: 220,
        enableSorting: false,
        meta: { headerTitle: 'Team Member', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'compType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => {
          const t = row.original.compType;
          return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '-';
        },
        size: 80,
        enableSorting: true,
        meta: { headerTitle: 'Type', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const current = row.original.status ?? '';
          return <span>{current ? current.charAt(0) + current.slice(1).toLowerCase() : '-'}</span>;
        },
        size: 130,
        enableSorting: false,
        filterFn: () => true,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-7 w-[110px]" /> },
      },
      {
        accessorKey: 'rejectionReason',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Rejection Reason" />,
        cell: ({ row }) => {
          if (row.original.status !== 'REJECTED') return <span>-</span>;
          const reason = row.original.rejectionReason;
          if (!reason) return <span>-</span>;
          return <span className="whitespace-normal break-words">{reason}</span>;
        },
        size: 220,
        enableSorting: false,
        meta: { headerTitle: 'Rejection Reason', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'startingTime',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start" />,
        cell: ({ row }) =>
          row.original.startingTime
            ? format(new Date(String(row.original.startingTime)), 'dd-MMM-yyyy HH:mm')
            : '-',
        size: 155,
        enableSorting: true,
        meta: { headerTitle: 'Start', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'endingTime',
        header: ({ column }) => <DataGridColumnHeader column={column} title="End" />,
        cell: ({ row }) =>
          row.original.endingTime
            ? format(new Date(String(row.original.endingTime)), 'dd-MMM-yyyy HH:mm')
            : '-',
        size: 155,
        enableSorting: true,
        meta: { headerTitle: 'End', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'dayHours',
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
        enableSorting: true,
        meta: { headerTitle: 'Day hours', skeleton: <Skeleton className="h-4 w-10 ml-auto" /> },
      },
      {
        accessorKey: 'nightHours',
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
        enableSorting: true,
        meta: { headerTitle: 'Night hours', skeleton: <Skeleton className="h-4 w-10 ml-auto" /> },
      },
      {
        accessorKey: 'nightMultipliedHours',
        header: ({ column }) => (
          <div className="text-right">
            <DataGridColumnHeader column={column} title="Multiplied Night hours" />
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {row.original.nightMultipliedHours != null ? String(row.original.nightMultipliedHours) : '-'}
          </div>
        ),
        size: 160,
        enableSorting: false,
        meta: { headerTitle: 'Multiplied Night hours', skeleton: <Skeleton className="h-4 w-10 ml-auto" /> },
      },
      {
        accessorKey: 'reportLevel',
        header: () => null,
        cell: () => null,
        size: 0,
        enableSorting: false,
        filterFn: () => true,
        meta: { headerTitle: 'Report Level' },
      },
      {
        id: 'totalHours',
        header: ({ column }) => (
          <div className="text-right">
            <DataGridColumnHeader column={column} title="Total hours" />
          </div>
        ),
        cell: ({ row }) => {
          const total = (row.original.dayHours ?? 0) + (row.original.nightMultipliedHours ?? 0);
          return (
            <div className="text-right">
              {Math.round(total * 100) / 100}
            </div>
          );
        },
        size: 115,
        enableSorting: false,
        meta: { headerTitle: 'Total hours', skeleton: <Skeleton className="h-4 w-10 ml-auto" /> },
      },
    ],
    [isUserRole],
  );

  const reportLevelOptions = useMemo(() => {
    return Array.from({ length: maxHierarchyDepth }, (_, i) => ({
      label: `Level ${i + 1}`,
      value: String(i + 1),
    }));
  }, [maxHierarchyDepth]);

  const hasColumnSearches = Object.values(columnSearches).some(Boolean);

  const isFiltered = columnFilters.length > 0;

  const pageCount = Math.ceil(total / pagination.pageSize);

  const table = useReactTable({
    data: records,
    columns,
    pageCount,
    state: { sorting, rowSelection, columnFilters, columnVisibility, pagination },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canRead('CompensatoryTime')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Approval Management</ToolbarPageTitle>
          <ToolbarDescription>Manage approval requests</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={() => {
            const statusFilter = columnFilters.find((f) => f.id === 'status');
          const statuses = Array.isArray(statusFilter?.value) && statusFilter.value.length > 0
              ? (statusFilter.value as string[])
              : undefined;
            const rlFilter = columnFilters.find((f) => f.id === 'reportLevel');
            const reportLevels = Array.isArray(rlFilter?.value) && (rlFilter.value as string[]).length > 0
              ? (rlFilter.value as string[]).map((v) => parseInt(v, 10)).filter((n) => !isNaN(n))
              : undefined;
            loadData(pagination.pageIndex, pagination.pageSize, statuses, reportLevels);
          }} disabled={loading}>
            <RefreshCw size={16} className={`me-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="mt-6 flex items-center gap-3">
        <DataGridColumnFilter
          column={table.getColumn('status')}
          title="Filter by Status"
          options={[
            { label: 'Submitted', value: 'SUBMITTED' },
            { label: 'Approved', value: 'APPROVED' },
            { label: 'Rejected', value: 'REJECTED' },
          ]}
        />
        <DataGridColumnFilter
          column={table.getColumn('reportLevel')}
          title="Report Level"
          options={reportLevelOptions}
        />
        <Button
          variant={showColumnSearch || hasColumnSearches ? 'secondary' : 'outline'}
          onClick={() => setShowColumnSearch((v) => !v)}
          className="h-9 px-3 gap-1.5"
        >
          <Filter size={14} />
          Column search
          {hasColumnSearches && <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 leading-none">{Object.values(columnSearches).filter(Boolean).length}</span>}
        </Button>
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-9 px-2 lg:px-3">
            Reset <X className="ml-2 h-4 w-4" />
          </Button>
        )}
        {(() => {
          const selectedRows = Object.keys(rowSelection)
            .filter((k) => rowSelection[k])
            .map((k) => records[Number(k)])
            .filter(Boolean);
          const uniqueStatuses = new Set(selectedRows.map((r) => r.status));
          const sharedStatus = uniqueStatuses.size === 1 ? [...uniqueStatuses][0] : null;
          const allOptions: { status: string; label: string }[] = [
            { status: 'APPROVED', label: 'Approve' },
            { status: 'REJECTED', label: 'Reject' },
            { status: 'SUBMITTED', label: 'Submit (Pending Approval)' },
          ];
          const visibleOptions = allOptions.filter((o) => o.status !== sharedStatus);
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={selectedRows.length === 0 || isBulkUpdating}
                >
                  <ListChecks size={16} className="mr-1" />
                  Set Status
                  <ChevronDown size={16} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {visibleOptions.map((o) => (
                  <DropdownMenuItem key={o.status} onClick={() => openBulkConfirm(o.status, o.label)}>
                    {o.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })()}
      </div>

      {showColumnSearch && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-md border border-dashed px-4 py-3">
          {([
            { id: 'teamMemberId', label: 'Team Member' },
            { id: 'projectId', label: 'Project' },
            { id: 'subject', label: 'Description' },
            { id: 'rejectionReason', label: 'Rejection Reason' },
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

      <div className="mt-4">
        <DataGridContainer>
          <DataGrid
            table={table}
            recordCount={total}
            isLoading={loading}
            emptyMessage="No compensatory time records found."
            tableLayout={{
              width: 'fixed',
              columnsResizable: true,
              columnsMovable: true,
              columnsVisibility: true,
            }}
          >
            <DataGridTable />
            <DataGridPaginationLeftInfo sizes={[10, 25, 50]} />
          </DataGrid>
        </DataGridContainer>
      </div>

      {isUserRole && records.some((r) => (r.reportLevel ?? 0) > 1) && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-muted bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-gray-400 border border-gray-500" />
          <p>
            <span className="font-medium text-foreground">Grayed-out rows</span> are visible for your reference but cannot be actioned by you.
            These records belong to team members who do not report to you directly &mdash; they fall under a different supervisory level.
          </p>
        </div>
      )}

      <AlertDialog
        open={!!bulkConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setBulkConfirm(null);
            setRejectionReason('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm status change</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to set the status to <strong>{bulkConfirm?.label}</strong> for{' '}
              <strong>{bulkConfirm?.count}</strong> selected record{bulkConfirm && bulkConfirm.count > 1 ? 's' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {bulkConfirm?.status === 'REJECTED' && (
            <div className="flex flex-col gap-1.5 px-0 pb-2">
              <label className="text-sm font-medium" htmlFor="rejection-reason">
                Rejection reason
              </label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                disabled={isBulkUpdating}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkStatusChange} disabled={isBulkUpdating}>
              {isBulkUpdating ? 'Applying...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
