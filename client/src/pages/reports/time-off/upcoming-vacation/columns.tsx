import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { UpcomingVacationRowDTO } from '@shared/dto/UpcomingVacation';

const EM_DASH = '—';

function formatDate(val: string | null | undefined): string {
  if (!val) return EM_DASH;
  const [y, m, d] = val.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d}-${months[Number(m) - 1]}-${y}`;
}

function statusVariant(name: string): 'success' | 'secondary' | 'destructive' | 'outline' {
  const l = name.toLowerCase();
  if (l.includes('approved')) return 'success';
  if (l.includes('pending') || l.includes('tentative')) return 'secondary';
  if (l.includes('cancel') || l.includes('reject')) return 'destructive';
  return 'outline';
}

function typeVariant(type: string): 'default' | 'outline' {
  return type === 'Holiday Swap' ? 'outline' : 'default';
}

export function useUpcomingVacationColumns(): ColumnDef<UpcomingVacationRowDTO>[] {
  return useMemo<ColumnDef<UpcomingVacationRowDTO>[]>(
    () => [
      {
        accessorKey: 'workdayId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Workday ID" />,
        cell: ({ row }) => (
          <span className="whitespace-normal break-words">{row.original.workdayId ?? EM_DASH}</span>
        ),
        size: 120,
        meta: { headerTitle: 'Workday ID', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'fullName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <span className="whitespace-normal break-words">{row.original.fullName}</span>
        ),
        size: 200,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'email',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
          <span className="whitespace-normal break-all">{row.original.email ?? EM_DASH}</span>
        ),
        size: 220,
        meta: { headerTitle: 'Email', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <Badge variant={typeVariant(row.original.type)}>
            {row.original.type}
          </Badge>
        ),
        size: 130,
        meta: { headerTitle: 'Type', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'category',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Category" />,
        cell: ({ row }) => (
          <span className="whitespace-normal break-words">{row.original.category}</span>
        ),
        size: 160,
        meta: { headerTitle: 'Category', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'startDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => formatDate(row.original.startDate),
        size: 120,
        meta: { headerTitle: 'Start Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'endDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="End Date" />,
        cell: ({ row }) => formatDate(row.original.endDate),
        size: 120,
        meta: { headerTitle: 'End Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
        size: 120,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'days',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Days" />,
        cell: ({ row }) => (
          <span className="block text-right">{row.original.days}</span>
        ),
        size: 70,
        meta: { headerTitle: 'Days', skeleton: <Skeleton className="h-4 w-8" /> },
      },
    ],
    [],
  );
}
