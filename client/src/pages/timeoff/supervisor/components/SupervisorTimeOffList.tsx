import { useMemo, useState } from 'react';
import { XCircle, Search, Pencil } from 'lucide-react';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import type { TimeOffWithDetailsDTO } from '@shared/dto/TimeOff';
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

interface SupervisorTimeOffListProps {
  timeOffs: TimeOffWithDetailsDTO[];
  loading: boolean;
  onEditClick: (timeOff: TimeOffWithDetailsDTO) => void;
  onCancelClick: (timeOff: TimeOffWithDetailsDTO) => void;
  onRowClick?: (timeOff: TimeOffWithDetailsDTO) => void;
}

/**
 * Get badge variant based on status name
 */
function getStatusVariant(statusName: string): 'success' | 'secondary' | 'destructive' | 'outline' {
  const statusLower = statusName.toLowerCase();
  if (statusLower.includes('approved')) return 'success';
  if (statusLower.includes('tentative') || statusLower.includes('pending')) return 'secondary';
  if (statusLower.includes('cancelled') || statusLower.includes('rejected')) return 'destructive';
  return 'outline';
}

/**
 * Check if a time-off can be cancelled
 */
function canCancel(timeOff: TimeOffWithDetailsDTO): boolean {
  const statusLower = timeOff.statusName.toLowerCase();
  return !statusLower.includes('cancelled');
}

/**
 * Check if a time-off can be edited (only future time offs)
 */
function canEdit(timeOff: TimeOffWithDetailsDTO): boolean {
  const statusLower = timeOff.statusName.toLowerCase();
  if (statusLower.includes('cancelled')) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = parseUTCDateAsLocal(timeOff.timeOffStartDate);

  return startDate >= today;
}

export function SupervisorTimeOffList({ timeOffs, loading, onEditClick, onCancelClick, onRowClick }: SupervisorTimeOffListProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timeOffStartDate', desc: false }
  ]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Filter out cancelled time-offs
  const filteredTimeOffs = useMemo(() =>
    timeOffs.filter(t => !t.statusName.toLowerCase().includes('cancelled')),
    [timeOffs]
  );

  const columns = useMemo<ColumnDef<TimeOffWithDetailsDTO>[]>(
    () => [
      {
        accessorKey: 'categoryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Category" />,
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
        accessorKey: 'statusName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge variant={getStatusVariant(row.original.statusName)}>
            {row.original.statusName}
          </Badge>
        ),
        size: 120,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-16" /> },
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditClick(row.original);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {showCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelClick(row.original);
                  }}
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
    data: filteredTimeOffs,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: { pageSize: 5 },
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

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

      {filteredTimeOffs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No time off requests found for this team member.
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search time off requests..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Data Grid */}
          <DataGridContainer border={false}>
            <DataGrid
              table={table}
              recordCount={table.getFilteredRowModel().rows.length}
              tableLayout={{
                headerBackground: true,
                headerBorder: true,
                rowBorder: true,
              }}
              onRowClick={onRowClick}
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
