import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { Clock, X } from 'lucide-react';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/components/ui/toolbar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/auth/auth-provider';
import { usePermissions } from '@/hooks/usePermissions';
import { formatUTCDate } from '@/lib/utils';
import type { TimeOffActivityLogEntryDTO } from '@shared/dto/TimeOffActivityLog';
import { useTimeOffActivity, type ActivityScope } from './hooks/useTimeOffActivity';
import { classifyChange } from './utils/classifyChange';

const EM_DASH = '—';

const CHANGE_TYPE_OPTIONS = [
  { label: 'Created',       value: 'created' },
  { label: 'Approved',      value: 'approved' },
  { label: 'Declined',      value: 'declined' },
  { label: 'Cancelled',     value: 'cancelled' },
  { label: 'Dates Changed', value: 'dates-changed' },
  { label: 'Modified',      value: 'modified' },
];

function fmtDate(val: string | null | undefined): string {
  if (!val) return EM_DASH;
  return formatUTCDate(val);
}

function changeTypeBadgeVariant(type: ReturnType<typeof classifyChange>): 'success' | 'secondary' | 'destructive' | 'outline' | 'primary' {
  switch (type) {
    case 'approved':      return 'success';
    case 'created':       return 'primary';
    case 'declined':      return 'destructive';
    case 'cancelled':     return 'secondary';
    case 'dates-changed': return 'outline';
    default:              return 'outline';
  }
}

function changeTypeLabel(type: ReturnType<typeof classifyChange>): string {
  switch (type) {
    case 'created':       return 'Created';
    case 'approved':      return 'Approved';
    case 'declined':      return 'Declined';
    case 'cancelled':     return 'Cancelled';
    case 'dates-changed': return 'Dates Changed';
    default:              return 'Modified';
  }
}

export function TimeOffActivityPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { canRead } = usePermissions();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const isSupervisor = canRead('SupervisorTimeOff');
  const scope = (searchParams.get('scope') === 'team' && isSupervisor ? 'team' : 'mine') as ActivityScope;

  const { data, total, page, setPage, pageSize, loading } = useTimeOffActivity(scope);

  const pagination: PaginationState = { pageIndex: page, pageSize };

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();
    data.forEach((row) => {
      const val = row.currentCategory ?? row.newCategory ?? row.origCategory;
      if (val) unique.add(val);
    });
    return Array.from(unique).sort().map((v) => ({ label: v, value: v }));
  }, [data]);

  const statusOptions = useMemo(() => {
    const unique = new Set<string>();
    data.forEach((row) => {
      if (row.newStatus)  unique.add(row.newStatus);
      if (row.origStatus) unique.add(row.origStatus);
    });
    return Array.from(unique).sort().map((v) => ({ label: v, value: v }));
  }, [data]);

  const columns = useMemo<ColumnDef<TimeOffActivityLogEntryDTO>[]>(
    () => [
      {
        accessorKey: 'changeDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Change Date" />,
        cell: ({ row }) => fmtDate(row.original.changeDate),
        size: 130,
        meta: { headerTitle: 'Change Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      ...(scope === 'team'
        ? [{
            accessorKey: 'employeeFullName' as const,
            header: ({ column }: any) => <DataGridColumnHeader column={column} title="Employee" />,
            cell: ({ row }: any) => row.original.employeeFullName,
            size: 180,
            meta: { headerTitle: 'Employee', skeleton: <Skeleton className="h-4 w-32" /> },
          }]
        : []),
      {
        id: 'category',
        accessorFn: (row) => row.currentCategory ?? row.newCategory ?? row.origCategory ?? '',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Category" />,
        cell: ({ row }) => row.original.currentCategory ?? row.original.newCategory ?? row.original.origCategory ?? EM_DASH,
        filterFn: (row, _, filterValues: string[]) => {
          if (!filterValues.length) return true;
          const val = row.original.currentCategory ?? row.original.newCategory ?? row.original.origCategory ?? '';
          return filterValues.includes(val);
        },
        size: 140,
        meta: { headerTitle: 'Category', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'changeType',
        accessorFn: (row) => classifyChange(row),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Change" />,
        cell: ({ row }) => {
          const type = classifyChange(row.original);
          return <Badge variant={changeTypeBadgeVariant(type)}>{changeTypeLabel(type)}</Badge>;
        },
        filterFn: (row, _, filterValues: string[]) => {
          if (!filterValues.length) return true;
          return filterValues.includes(classifyChange(row.original));
        },
        size: 130,
        meta: { headerTitle: 'Change', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        id: 'status',
        accessorFn: (row) => row.newStatus ?? row.origStatus ?? '',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const { origStatus, newStatus } = row.original;
          if (!origStatus && !newStatus) return EM_DASH;
          if (origStatus === newStatus)   return newStatus ?? EM_DASH;
          return (
            <span className="text-sm">
              {origStatus ?? EM_DASH}
              <span className="mx-1 text-muted-foreground">→</span>
              {newStatus ?? EM_DASH}
            </span>
          );
        },
        filterFn: (row, _, filterValues: string[]) => {
          if (!filterValues.length) return true;
          const val = row.original.newStatus ?? row.original.origStatus ?? '';
          return filterValues.includes(val);
        },
        size: 200,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        id: 'dates',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Dates" />,
        cell: ({ row }) => {
          const { currentStartDate, currentEndDate, origStartDate, origEndDate, newStartDate, newEndDate } = row.original;
          const currentRange = (currentStartDate ?? newStartDate)
            ? `${fmtDate(currentStartDate ?? newStartDate)} – ${fmtDate(currentEndDate ?? newEndDate)}`
            : null;
          const datesChanged = origStartDate !== newStartDate || origEndDate !== newEndDate;
          if (!currentRange) return EM_DASH;
          if (datesChanged && origStartDate) {
            const origRange = `${fmtDate(origStartDate)} – ${fmtDate(origEndDate)}`;
            return (
              <span className="text-sm">
                {origRange}
                <span className="mx-1 text-muted-foreground">→</span>
                {currentRange}
              </span>
            );
          }
          return currentRange;
        },
        size: 280,
        enableSorting: false,
        meta: { headerTitle: 'Dates', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'changedByName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Changed By" />,
        cell: ({ row }) => row.original.changedByName ?? EM_DASH,
        size: 160,
        meta: { headerTitle: 'Changed By', skeleton: <Skeleton className="h-4 w-28" /> },
      },
    ],
    [scope],
  );

  const table = useReactTable({
    data,
    columns,
    state: { pagination, sorting, columnFilters },
    pageCount: Math.ceil(total / pageSize),
    manualPagination: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      setPage(next.pageIndex);
    },
  });

  const isFiltered = columnFilters.length > 0;
  const filteredCount = table.getFilteredRowModel().rows.length;

  const handleRowClick = (entry: TimeOffActivityLogEntryDTO) => {
    const params = new URLSearchParams({ from: '/timeoff-activity', scope });
    if (scope === 'team' && user?.teamMemberId) {
      params.set('recipientId', String(user.teamMemberId));
    }
    navigate(`/timeoff-detail/${entry.timeOffId}?${params}`);
  };

  const handleScopeChange = (value: string) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('scope', value);
      return p;
    });
  };

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <ToolbarPageTitle>Time Off Activity</ToolbarPageTitle>
          </div>
          <ToolbarDescription>Your time-off change history</ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6 space-y-4">
        {isSupervisor && (
          <Tabs value={scope} onValueChange={handleScopeChange}>
            <TabsList variant="line">
              <TabsTrigger value="mine">Mine</TabsTrigger>
              <TabsTrigger value="team">My Team</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {loading && (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {!loading && (
          <>
            <div className="flex items-center gap-2">
              <DataGridColumnFilter
                column={table.getColumn('category')}
                title="Category"
                options={categoryOptions}
              />
              <DataGridColumnFilter
                column={table.getColumn('changeType')}
                title="Change"
                options={CHANGE_TYPE_OPTIONS}
              />
              <DataGridColumnFilter
                column={table.getColumn('status')}
                title="Status"
                options={statusOptions}
              />
              {isFiltered && (
                <Button
                  variant="ghost"
                  onClick={() => table.resetColumnFilters()}
                  className="h-8 px-2 lg:px-3"
                >
                  Reset
                  <X className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {isFiltered
                ? `${filteredCount.toLocaleString()} of ${total.toLocaleString()} record${total !== 1 ? 's' : ''} (filtered)`
                : `${total.toLocaleString()} record${total !== 1 ? 's' : ''} found`}
            </p>

            <DataGridContainer>
              <DataGrid
                table={table}
                recordCount={total}
                tableLayout={{
                  columnsResizable: true,
                  headerBackground: true,
                  headerBorder: true,
                  rowBorder: true,
                }}
                onRowClick={handleRowClick}
              >
                <div className="overflow-x-auto">
                  <DataGridTable />
                </div>
                <DataGridPagination sizes={[25, 50, 100]} />
              </DataGrid>
            </DataGridContainer>
          </>
        )}
      </div>
    </div>
  );
}
