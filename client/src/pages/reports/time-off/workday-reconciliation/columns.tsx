import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Skeleton } from '@/components/ui/skeleton';
import type { WorkdayReconciliationRowDTO } from '@shared/dto/WorkdayReconciliation';

const EM_DASH = '—';

export function useWorkdayReconciliationColumns(): ColumnDef<WorkdayReconciliationRowDTO>[] {
  return useMemo<ColumnDef<WorkdayReconciliationRowDTO>[]>(
    () => [
      {
        accessorKey: 'workdayId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Workday ID" />,
        cell: ({ row }) => <span>{row.original.workdayId ?? EM_DASH}</span>,
        size: 120,
        meta: { headerTitle: 'Workday ID', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="whitespace-normal break-words">{row.original.name ?? EM_DASH}</span>,
        size: 200,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'email',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Email" />,
        cell: ({ row }) => <span className="whitespace-normal break-all">{row.original.email ?? EM_DASH}</span>,
        size: 220,
        meta: { headerTitle: 'Email', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'supervisorWorkdayId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Supervisor WD ID" />,
        cell: ({ row }) => <span>{row.original.supervisorWorkdayId ?? EM_DASH}</span>,
        size: 140,
        meta: { headerTitle: 'Supervisor WD ID', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'supervisorName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Supervisor" />,
        cell: ({ row }) => <span className="whitespace-normal break-words">{row.original.supervisorName ?? EM_DASH}</span>,
        size: 200,
        meta: { headerTitle: 'Supervisor', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'date',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Date" />,
        cell: ({ row }) => <span>{row.original.date ?? EM_DASH}</span>,
        size: 120,
        meta: { headerTitle: 'Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'appType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="App Type" />,
        cell: ({ row }) => <span>{row.original.appType ?? EM_DASH}</span>,
        size: 140,
        meta: { headerTitle: 'App Type', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'appStatus',
        header: ({ column }) => <DataGridColumnHeader column={column} title="App Status" />,
        cell: ({ row }) => <span>{row.original.appStatus ?? EM_DASH}</span>,
        size: 130,
        meta: { headerTitle: 'App Status', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'originalDates',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Original Dates" />,
        cell: ({ row }) => <span className="whitespace-normal break-words">{row.original.originalDates ?? EM_DASH}</span>,
        size: 180,
        meta: { headerTitle: 'Original Dates', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'country',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Country" />,
        cell: ({ row }) => <span>{row.original.country ?? EM_DASH}</span>,
        size: 90,
        meta: { headerTitle: 'Country', skeleton: <Skeleton className="h-4 w-14" /> },
      },
    ],
    [],
  );
}
