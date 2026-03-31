import { useMemo, useState } from 'react';
import { XCircle, Search, Pencil } from 'lucide-react';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import type { TimeOffWithDetailsDTO } from '@shared/dto/TimeOff';
import { VACATION_CATEGORY_NAME } from '../../utils/elSalvadorVacationValidation';
import type { CategoryMode } from './SupervisorTimeOffForm';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SupervisorTimeOffListProps {
  timeOffs: TimeOffWithDetailsDTO[];
  loading: boolean;
  onEditClick: (timeOff: TimeOffWithDetailsDTO) => void;
  onCancelClick: (timeOff: TimeOffWithDetailsDTO) => void;
  onRowClick?: (timeOff: TimeOffWithDetailsDTO) => void;
  categoryMode?: CategoryMode;
  selectedTimeOffId?: number | null;
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
 * Check if a time-off can be edited (only future time offs, not cancelled or rejected)
 */
function canEdit(timeOff: TimeOffWithDetailsDTO): boolean {
  const statusLower = timeOff.statusName.toLowerCase();
  if (statusLower.includes('cancelled') || statusLower.includes('rejected')) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = parseUTCDateAsLocal(timeOff.timeOffStartDate);

  return startDate >= today;
}

export function SupervisorTimeOffList({ timeOffs, loading, onEditClick, onCancelClick, onRowClick, categoryMode, selectedTimeOffId }: SupervisorTimeOffListProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timeOffStartDate', desc: false }
  ]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const filteredTimeOffs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let result = timeOffs;

    if (categoryMode === 'vacation-only') {
      result = result.filter(
        (t) => t.categoryName.toLowerCase() === VACATION_CATEGORY_NAME.toLowerCase()
      );
    } else if (categoryMode === 'exclude-vacation') {
      result = result.filter(
        (t) => t.categoryName.toLowerCase() !== VACATION_CATEGORY_NAME.toLowerCase()
      );
    }

    if (!showPast) {
      result = result.filter((t) => {
        const end = parseUTCDateAsLocal(String(t.timeOffEndDate));
        end.setHours(0, 0, 0, 0);
        return end >= today;
      });
    }

    if (!showCancelled) {
      result = result.filter((t) => !t.statusName.toLowerCase().includes('cancelled'));
    }

    return result;
  }, [timeOffs, showCancelled, showPast, categoryMode]);

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
        size: 120,
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

      {timeOffs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No time off requests found for this team member.
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Search + Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search time off requests..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-past-supervisor"
                checked={showPast}
                onCheckedChange={(checked) => setShowPast(checked === true)}
              />
              <Label htmlFor="show-past-supervisor" className="text-sm font-medium leading-none">
                Show past
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-cancelled-supervisor"
                checked={showCancelled}
                onCheckedChange={(checked) => setShowCancelled(checked === true)}
              />
              <Label
                htmlFor="show-cancelled-supervisor"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show cancelled
              </Label>
            </div>
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
              getRowClassName={(row) =>
                selectedTimeOffId === row.timeOffId ? 'bg-muted/60' : ''
              }
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
