import { useMemo, useState } from 'react';
import { XCircle, Pencil } from 'lucide-react';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import type { TimeOffWithTeamMemberDTO } from '@shared/dto/TimeOff';
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from '@tanstack/react-table';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface TimeOffManagementGridProps {
  timeOffs: TimeOffWithTeamMemberDTO[];
  loading: boolean;
  showCancelled: boolean;
  onEditClick: (timeOff: TimeOffWithTeamMemberDTO) => void;
  onCancelClick: (timeOff: TimeOffWithTeamMemberDTO) => void;
  onRowClick?: (timeOff: TimeOffWithTeamMemberDTO) => void;
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
function canCancel(timeOff: TimeOffWithTeamMemberDTO): boolean {
  const statusLower = timeOff.statusName.toLowerCase();
  return !statusLower.includes('cancelled');
}

/**
 * Check if a time-off can be edited (only future time offs, not cancelled or rejected)
 */
function canEdit(timeOff: TimeOffWithTeamMemberDTO): boolean {
  const statusLower = timeOff.statusName.toLowerCase();
  if (statusLower.includes('cancelled') || statusLower.includes('rejected')) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = parseUTCDateAsLocal(timeOff.timeOffStartDate);

  return startDate >= today;
}

export function TimeOffManagementGrid({
  timeOffs,
  loading,
  showCancelled,
  onEditClick,
  onCancelClick,
  onRowClick,
}: TimeOffManagementGridProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timeOffStartDate', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Filter out cancelled time-offs unless showCancelled is true
  const filteredTimeOffs = useMemo(() => {
    if (showCancelled) return timeOffs;
    return timeOffs.filter(t => !t.statusName.toLowerCase().includes('cancelled'));
  }, [timeOffs, showCancelled]);

  const columns = useMemo<ColumnDef<TimeOffWithTeamMemberDTO>[]>(
    () => [
      {
        accessorKey: 'workdayId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="WDID" />,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.workdayId}</span>
        ),
        size: 100,
        enableColumnFilter: true,
        filterFn: 'includesString',
        meta: { headerTitle: 'WDID', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'teamMemberFullName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Team Member" />,
        size: 180,
        enableColumnFilter: true,
        filterFn: 'includesString',
        meta: { headerTitle: 'Team Member', skeleton: <Skeleton className="h-4 w-28" /> },
      },
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
        accessorKey: 'timeOffDays',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Days" />,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.timeOffDays}</span>
        ),
        size: 70,
        meta: { headerTitle: 'Days', skeleton: <Skeleton className="h-4 w-8" /> },
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
      columnFilters,
    },
    initialState: {
      pagination: { pageSize: 30 },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Column Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label htmlFor="wdid-filter" className="text-sm text-muted-foreground">WDID</Label>
          <Input
            id="wdid-filter"
            placeholder="Filter by WDID..."
            value={(table.getColumn('workdayId')?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn('workdayId')?.setFilterValue(e.target.value)}
            className="h-9 w-[180px]"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="name-filter" className="text-sm text-muted-foreground">Team Member</Label>
          <Input
            id="name-filter"
            placeholder="Filter by name..."
            value={(table.getColumn('teamMemberFullName')?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn('teamMemberFullName')?.setFilterValue(e.target.value)}
            className="h-9 w-[200px]"
          />
        </div>
      </div>

      {/* Data Grid */}
      <DataGridContainer>
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          onRowClick={onRowClick}
          tableLayout={{
            headerBackground: true,
            headerBorder: true,
            rowBorder: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[30, 50, 100]} />
        </DataGrid>
      </DataGridContainer>
    </div>
  );
}
