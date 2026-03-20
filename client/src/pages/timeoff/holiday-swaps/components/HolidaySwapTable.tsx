import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';

interface HolidaySwapTableProps {
  swaps: HolidaySwapDTO[];
  loading: boolean;
  onCancel: (swap: HolidaySwapDTO) => void;
}

const STATUS_OPTIONS = [
  { label: 'Tentative', value: 'Tentative' },
  { label: 'Acknowledged', value: 'Acknowledged' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Cancelled', value: 'Cancelled' },
];

function getStatusVariant(statusName: string): 'primary' | 'secondary' | 'destructive' | 'outline' {
  const name = statusName.toLowerCase();
  if (name === 'acknowledged') return 'primary';
  if (name === 'tentative') return 'secondary';
  if (name === 'rejected' || name === 'cancelled') return 'destructive';
  return 'outline';
}

function canCancel(swap: HolidaySwapDTO): boolean {
  const status = swap.statusName.toLowerCase();
  if (status !== 'tentative' && status !== 'acknowledged') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const originalDate = parseUTCDateAsLocal(String(swap.originalDate));
  originalDate.setHours(0, 0, 0, 0);
  return originalDate > today;
}

export function HolidaySwapTable({ swaps, loading, onCancel }: HolidaySwapTableProps) {
  const columns = useMemo<ColumnDef<HolidaySwapDTO>[]>(
    () => [
      {
        accessorKey: 'holidayName',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Holiday Name" />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.holidayName}</span>,
        meta: { headerTitle: 'Holiday Name' },
      },
      {
        accessorKey: 'originalDate',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Holiday Date" />
        ),
        cell: ({ row }) => formatUTCDate(row.original.originalDate),
        meta: { headerTitle: 'Holiday Date' },
      },
      {
        accessorKey: 'replacementDate',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Replacement Date" />
        ),
        cell: ({ row }) => formatUTCDate(row.original.replacementDate),
        meta: { headerTitle: 'Replacement Date' },
      },
      {
        accessorKey: 'statusName',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => (
          <Badge variant={getStatusVariant(row.original.statusName)}>
            {row.original.statusName}
          </Badge>
        ),
        meta: { headerTitle: 'Status' },
        filterFn: (row, _, filterValues: string[]) =>
          filterValues.includes(row.original.statusName),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Created At" />
        ),
        cell: ({ row }) =>
          row.original.createdAt ? formatUTCDate(row.original.createdAt) : '—',
        meta: { headerTitle: 'Created At' },
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) =>
          canCancel(row.original) ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(row.original)}
            >
              Cancel
            </Button>
          ) : null,
        enableSorting: false,
      },
    ],
    [onCancel]
  );

  const table = useReactTable({
    data: swaps,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <DataGridColumnFilter
          column={table.getColumn('statusName')}
          title="Status"
          options={STATUS_OPTIONS}
        />
      </div>
      <DataGridContainer>
        <DataGrid table={table} recordCount={swaps.length} isLoading={loading}>
          <DataGridTable />
          <DataGridPagination />
        </DataGrid>
      </DataGridContainer>
    </div>
  );
}
