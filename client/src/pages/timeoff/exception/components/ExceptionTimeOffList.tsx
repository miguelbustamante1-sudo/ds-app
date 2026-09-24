import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, Pencil, X } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
import type { TimeOffWithDetailsDTO } from '@shared/dto/TimeOff';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getStatusBadgeProps } from '@/lib/badge-utils';
import { isPastTimeOff, isExcludedStatus, filterVisibleForOptions } from '../utils/exceptionTimeOffFilters';

function canEdit(timeOff: TimeOffWithDetailsDTO): boolean {
  const s = timeOff.statusName.toLowerCase();
  return !s.includes('cancelled') && !s.includes('rejected');
}

function canCancel(timeOff: TimeOffWithDetailsDTO): boolean {
  return !timeOff.statusName.toLowerCase().includes('cancelled');
}

interface ExceptionTimeOffListProps {
  timeOffs: TimeOffWithDetailsDTO[];
  loading: boolean;
  onEditClick: (timeOff: TimeOffWithDetailsDTO) => void;
  onCancelClick: (timeOff: TimeOffWithDetailsDTO) => void;
}

export function ExceptionTimeOffList({ timeOffs, loading, onEditClick, onCancelClick }: ExceptionTimeOffListProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timeOffStartDate', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    { id: 'isPast', value: false },
    { id: 'isExcludedStatus', value: false },
  ]);

  const showPast = (columnFilters.find((f) => f.id === 'isPast')?.value as boolean | undefined) ?? false;
  const showCancelled = (columnFilters.find((f) => f.id === 'isExcludedStatus')?.value as boolean | undefined) ?? false;

  const categoryOptions = useMemo(() => {
    const visible = filterVisibleForOptions(timeOffs, showPast, showCancelled);
    const unique = new Map<string, string>();
    visible.forEach((t) => unique.set(t.categoryName, t.categoryName));
    return Array.from(unique, ([value]) => ({ value, label: value }));
  }, [timeOffs, showPast, showCancelled]);

  const statusOptions = useMemo(() => {
    const visible = filterVisibleForOptions(timeOffs, showPast, showCancelled);
    const unique = new Map<string, string>();
    visible.forEach((t) => unique.set(t.statusName, t.statusName));
    return Array.from(unique, ([value]) => ({ value, label: value }));
  }, [timeOffs, showPast, showCancelled]);

  const columns = useMemo<ColumnDef<TimeOffWithDetailsDTO>[]>(
    () => [
      {
        accessorKey: 'categoryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Category" />,
        filterFn: (row, _, filterValues: string[]) => filterValues.includes(row.original.categoryName),
        size: 150,
        meta: { headerTitle: 'Category', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'timeOffStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => formatUTCDate(row.original.timeOffStartDate),
        size: 120,
        meta: { headerTitle: 'Start Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'timeOffEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="End Date" />,
        cell: ({ row }) => formatUTCDate(row.original.timeOffEndDate),
        size: 120,
        meta: { headerTitle: 'End Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'timeOffDays',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Days" />,
        cell: ({ row }) => <span>{row.original.timeOffDays}</span>,
        size: 80,
        meta: { headerTitle: 'Days', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'statusName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const { variant, className } = getStatusBadgeProps(row.original.statusId);
          return (
            <Badge variant={variant} className={className}>
              {row.original.statusName}
            </Badge>
          );
        },
        filterFn: (row, _, filterValues: string[]) => filterValues.includes(row.original.statusName),
        size: 130,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'isPast',
        accessorFn: (row) => isPastTimeOff(row.timeOffEndDate),
        filterFn: (row, columnId, filterValue: boolean) =>
          filterValue === true || row.getValue(columnId) === false,
      },
      {
        id: 'isExcludedStatus',
        accessorFn: (row) => isExcludedStatus(row.statusId),
        filterFn: (row, columnId, filterValue: boolean) =>
          filterValue === true || row.getValue(columnId) === false,
      },
      {
        accessorKey: 'changeLogCount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Changes" />,
        cell: ({ row }) => <span>{row.original.changeLogCount}</span>,
        size: 90,
        meta: { headerTitle: 'Changes', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const showEdit = canEdit(row.original);
          const showCancel = canCancel(row.original);
          if (!showEdit && !showCancel) return null;
          return (
            <div className="flex items-center gap-1">
              {showEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onEditClick(row.original); }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {showCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onCancelClick(row.original); }}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          );
        },
        size: 180,
        meta: { headerTitle: 'Actions', skeleton: <Skeleton className="h-4 w-16" /> },
      },
    ],
    [onEditClick, onCancelClick]
  );

  const table = useReactTable({
    data: timeOffs,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: { pageSize: 10 },
      columnVisibility: { isPast: false, isExcludedStatus: false },
    },
  });

  const isFiltered = columnFilters.some(
    (f) => (f.id === 'categoryName' || f.id === 'statusName') && Array.isArray(f.value) && f.value.length > 0
  );

  const handleReset = () => {
    table.getColumn('categoryName')?.setFilterValue(undefined);
    table.getColumn('statusName')?.setFilterValue(undefined);
    table.getColumn('isPast')?.setFilterValue(false);
    table.getColumn('isExcludedStatus')?.setFilterValue(false);
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Time Off Requests</h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Time Off Requests</h3>
      </div>

      {timeOffs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No time off requests found for this team member.
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            {table.getColumn('categoryName') && (
              <DataGridColumnFilter
                column={table.getColumn('categoryName')}
                title="Category"
                options={categoryOptions}
              />
            )}
            {table.getColumn('statusName') && (
              <DataGridColumnFilter
                column={table.getColumn('statusName')}
                title="Status"
                options={statusOptions}
              />
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="show-past"
                checked={showPast}
                onCheckedChange={(checked) => table.getColumn('isPast')?.setFilterValue(checked)}
              />
              <Label htmlFor="show-past" className="text-sm text-muted-foreground">
                Show Past
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-cancelled"
                checked={showCancelled}
                onCheckedChange={(checked) => table.getColumn('isExcludedStatus')?.setFilterValue(checked)}
              />
              <Label htmlFor="show-cancelled" className="text-sm text-muted-foreground">
                Show Cancelled
              </Label>
            </div>
            {isFiltered && (
              <Button
                variant="ghost"
                onClick={handleReset}
                className="h-8 px-2 lg:px-3"
              >
                Reset
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          <DataGridContainer border={false}>
            <DataGrid
              table={table}
              recordCount={timeOffs.length}
              tableLayout={{
                columnsResizable: true,
                headerBackground: true,
                headerBorder: true,
                rowBorder: true,
              }}
              onRowClick={(row) => navigate(`/timeoff-exception-detail/${row.timeOffId}`)}
            >
              <DataGridTable />
              <DataGridPagination sizes={[10, 25, 50]} />
            </DataGrid>
          </DataGridContainer>
        </div>
      )}
    </div>
  );
}
