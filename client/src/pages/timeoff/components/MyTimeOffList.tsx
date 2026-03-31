import { useMemo, useState } from 'react';
import { Pencil, XCircle, Search } from 'lucide-react';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import type { TimeOffWithDetailsDTO } from '../../../../../shared/dto/TimeOff';
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { WorkdayBalanceBadges } from './WorkdayBalanceBadges';

interface MyTimeOffListProps {
  timeOffs: TimeOffWithDetailsDTO[] | undefined;
  loading: boolean;
  balance?: { vacation: number; personalDays: number; exceptionDaysUsed: number; exceptionDaysRemaining: number } | null;
  balanceLoading?: boolean;
  countryIso?: string | null;
  onEditClick?: (timeOff: TimeOffWithDetailsDTO) => void;
  onCancelClick?: (timeOff: TimeOffWithDetailsDTO) => void;
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
 * Check if a time-off can be edited (not cancelled or rejected status)
 */
function canModify(timeOff: TimeOffWithDetailsDTO): boolean {
  const statusLower = timeOff.statusName.toLowerCase();
  return !statusLower.includes('cancelled') && !statusLower.includes('rejected');
}

/**
 * Check if a time-off can be self-cancelled (status guard + days-before rule)
 */
function canCancel(timeOff: TimeOffWithDetailsDTO): boolean {
  const statusLower = timeOff.statusName.toLowerCase();
  if (statusLower.includes('cancelled') || statusLower.includes('rejected')) return false;

  const required = Math.max(timeOff.categoryCountryDaysBefore ?? 0, 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = parseUTCDateAsLocal(String(timeOff.timeOffStartDate));
  startDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((startDate.getTime() - today.getTime()) / 86_400_000);

  return diffDays > required;
}

export function MyTimeOffList({ timeOffs, loading, balance, balanceLoading, countryIso, onEditClick, onCancelClick, onRowClick }: MyTimeOffListProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);

  const columns = useMemo<ColumnDef<TimeOffWithDetailsDTO>[]>(
    () => [
      {
        accessorKey: 'timeOffId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-medium">{row.original.timeOffId}</span>,
        size: 80,
        meta: { headerTitle: 'ID', skeleton: <Skeleton className="h-4 w-12" /> },
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
          const showEdit = onEditClick && canModify(row.original);
          const showCancel = onCancelClick && canCancel(row.original);
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
                  className="text-muted-foreground hover:text-foreground"
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
        meta: { headerTitle: 'Actions', skeleton: <Skeleton className="h-4 w-24" /> },
      },
    ],
    [onEditClick, onCancelClick]
  );

  const data = timeOffs ?? [];

  const filteredData = useMemo(() => {
    if (showCancelled) return data;
    return data.filter(t => !t.statusName.toLowerCase().includes('cancelled'));
  }, [data, showCancelled]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const listContent = () => {
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

    if (!data.length) {
      return (
        <div className="bg-card rounded-lg border">
          <div className="text-center py-12 text-muted-foreground">
            No time off requests found. Create your first request using the form.
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Search + Show Cancelled */}
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
            id="show-cancelled-my"
            checked={showCancelled}
            onCheckedChange={(checked) => setShowCancelled(checked === true)}
          />
          <Label
            htmlFor="show-cancelled-my"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Show cancelled
          </Label>
        </div>
      </div>

        {/* Data Grid */}
        <DataGridContainer>
          <DataGrid
            table={table}
            recordCount={filteredData.length}
            tableLayout={{
              headerBackground: true,
              headerBorder: true,
              rowBorder: true,
            }}
            onRowClick={onRowClick}
          >
            <DataGridTable />
          </DataGrid>
        </DataGridContainer>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <WorkdayBalanceBadges
        vacation={balance?.vacation ?? 0}
        personalDays={balance?.personalDays ?? 0}
        loading={balanceLoading}
        countryIso={countryIso}
        exceptionDaysRemaining={balance?.exceptionDaysRemaining}
      />
      {listContent()}
    </div>
  );
}
