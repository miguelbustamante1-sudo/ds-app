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

function getStatusVariant(statusName: string): 'success' | 'secondary' | 'destructive' | 'outline' {
  const s = statusName.toLowerCase();
  if (s.includes('approved')) return 'success';
  if (s.includes('tentative') || s.includes('pending')) return 'secondary';
  if (s.includes('cancelled') || s.includes('rejected')) return 'destructive';
  return 'outline';
}

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
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const categoryOptions = useMemo(() => {
    const unique = new Map<string, string>();
    timeOffs.forEach((t) => unique.set(t.categoryName, t.categoryName));
    return Array.from(unique, ([value]) => ({ value, label: value }));
  }, [timeOffs]);

  const statusOptions = useMemo(() => {
    const unique = new Map<string, string>();
    timeOffs.forEach((t) => unique.set(t.statusName, t.statusName));
    return Array.from(unique, ([value]) => ({ value, label: value }));
  }, [timeOffs]);

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
        cell: ({ row }) => (
          <Badge variant={getStatusVariant(row.original.statusName)}>
            {row.original.statusName}
          </Badge>
        ),
        filterFn: (row, _, filterValues: string[]) => filterValues.includes(row.original.statusName),
        size: 130,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-16" /> },
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
    initialState: { pagination: { pageSize: 5 } },
  });

  const isFiltered = columnFilters.length > 0;

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

          <DataGridContainer border={false}>
            <DataGrid
              table={table}
              recordCount={table.getFilteredRowModel().rows.length}
              tableLayout={{
                headerBackground: true,
                headerBorder: true,
                rowBorder: true,
              }}
              onRowClick={(row) => navigate(`/timeoff-exception-detail/${row.timeOffId}`)}
            >
              <DataGridTable />
              <DataGridPagination sizes={[5, 10, 25]} />
            </DataGrid>
          </DataGridContainer>
        </div>
      )}
    </div>
  );
}
