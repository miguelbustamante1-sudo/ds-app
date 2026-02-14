import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, XCircle, Search } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
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

interface MyTimeOffListProps {
  timeOffs: TimeOffWithDetailsDTO[] | undefined;
  loading: boolean;
  onEditClick?: (timeOff: TimeOffWithDetailsDTO) => void;
  onCancelClick?: (timeOff: TimeOffWithDetailsDTO) => void;
  highlightedId?: number | null;
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
 * Check if a time-off can be edited or cancelled (not cancelled status)
 */
function canModify(timeOff: TimeOffWithDetailsDTO): boolean {
  return !timeOff.statusName.toLowerCase().includes('cancelled');
}

export function MyTimeOffList({ timeOffs, loading, onEditClick, onCancelClick, highlightedId }: MyTimeOffListProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to highlighted row when it appears
  useEffect(() => {
    if (!highlightedId || loading) return;
    const timer = setTimeout(() => {
      const row = containerRef.current?.querySelector('.highlighted-row');
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    return () => clearTimeout(timer);
  }, [highlightedId, loading]);

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
        cell: ({ row }) =>
          canModify(row.original) ? (
            <div className="flex items-center gap-1">
              {onEditClick && (
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
              {onCancelClick && (
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
          ) : null,
        size: 180,
        meta: { headerTitle: 'Actions', skeleton: <Skeleton className="h-4 w-24" /> },
      },
    ],
    [onEditClick, onCancelClick]
  );

  const data = timeOffs ?? [];

  const table = useReactTable({
    data,
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
    <div className="space-y-4">
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
      <div ref={containerRef}>
        <DataGridContainer>
          <DataGrid
            table={table}
            recordCount={data.length}
            tableLayout={{
              headerBackground: true,
              headerBorder: true,
              rowBorder: true,
            }}
            getRowClassName={(row: TimeOffWithDetailsDTO) =>
              row.timeOffId === highlightedId
                ? 'highlighted-row bg-primary/10 ring-1 ring-primary/30'
                : ''
            }
          >
            <DataGridTable />
          </DataGrid>
        </DataGridContainer>
      </div>
    </div>
  );
}
