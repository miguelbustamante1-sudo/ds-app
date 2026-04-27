import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from '@tanstack/react-table';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { List, X } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

const STATUS_OPTIONS = [
  { label: 'Tentative', value: 'Tentative' },
  { label: 'Acknowledged', value: 'Acknowledged' },
  { label: 'Taken', value: 'Taken' },
  { label: 'Cancelled', value: 'Cancelled' },
  { label: 'Rejected', value: 'Rejected' },
];

function getStatusVariant(
  statusName: string
): 'primary' | 'secondary' | 'destructive' | 'outline' | 'success' {
  const name = statusName.toLowerCase();
  if (name === 'acknowledged') return 'primary';
  if (name === 'tentative') return 'secondary';
  if (name === 'taken') return 'success';
  if (name === 'rejected' || name === 'cancelled') return 'destructive';
  return 'outline';
}

interface ExceptionSwapListProps {
  swaps: HolidaySwapDTO[];
  loading: boolean;
  operationLoading: boolean;
  acknowledgedStatusId: number | null;
  rejectedStatusId: number | null;
  onEditClick: (swap: HolidaySwapDTO) => void;
  onCancelClick: (swap: HolidaySwapDTO) => void;
  onApprove: (swap: HolidaySwapDTO) => void;
  onReject: (swap: HolidaySwapDTO) => void;
}

export function ExceptionSwapList({
  swaps,
  loading,
  operationLoading,
  onEditClick,
  onCancelClick,
  onApprove,
  onReject,
}: ExceptionSwapListProps) {
  const columns = useMemo<ColumnDef<HolidaySwapDTO>[]>(
    () => [
      {
        accessorKey: 'holidayName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Holiday" />,
        cell: ({ row }) => <span className="font-medium">{row.original.holidayName}</span>,
      },
      {
        accessorKey: 'originalDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Holiday Date" />,
        cell: ({ row }) => formatUTCDate(row.original.originalDate),
      },
      {
        accessorKey: 'replacementDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Replacement Date" />,
        cell: ({ row }) => formatUTCDate(row.original.replacementDate),
      },
      {
        accessorKey: 'statusName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(row.original.statusName),
        cell: ({ row }) => (
          <Badge variant={getStatusVariant(row.original.statusName)}>
            {row.original.statusName}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Requested" />,
        cell: ({ row }) =>
          row.original.createdAt ? formatUTCDate(row.original.createdAt) : '—',
      },
      {
        id: 'actions',
        header: () => null,
        enableSorting: false,
        cell: ({ row }) => {
          const swap = row.original;
          // BSA: approve/reject/edit/cancel available for any status
          return (
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="primary"
                disabled={operationLoading}
                onClick={() => onApprove(swap)}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={operationLoading}
                onClick={() => onReject(swap)}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={operationLoading}
                onClick={() => onEditClick(swap)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={operationLoading}
                onClick={() => onCancelClick(swap)}
              >
                Cancel
              </Button>
            </div>
          );
        },
      },
    ],
    [operationLoading, onEditClick, onCancelClick, onApprove, onReject]
  );

  const table = useReactTable({
    data: swaps,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const columnFilters = table.getState().columnFilters;

  return (
    <Card>
      <CardContent>
        <CardTitle className="flex items-center gap-2 mb-4">
          <List className="h-4 w-4" />
          Holiday Swaps
        </CardTitle>

        <div className="flex items-center gap-2 mb-4">
          <DataGridColumnFilter
            column={table.getColumn('statusName')}
            title="Status"
            options={STATUS_OPTIONS}
          />
          {columnFilters.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => table.resetColumnFilters()}
              className="h-8 px-2 lg:px-3"
            >
              Reset <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <DataGridContainer>
            <DataGrid table={table} recordCount={swaps.length}>
              <DataGridTable />
              <DataGridPagination />
            </DataGrid>
          </DataGridContainer>
        )}
      </CardContent>
    </Card>
  );
}
