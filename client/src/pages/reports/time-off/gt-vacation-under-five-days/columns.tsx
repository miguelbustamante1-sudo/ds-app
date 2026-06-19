import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Skeleton } from '@/components/ui/skeleton';
import type { GtVacationUnderFiveDaysRowDTO } from '@shared/dto/GtVacationUnderFiveDays';

const EM_DASH = '—';

export function useGtVacationUnderFiveDaysColumns(): ColumnDef<GtVacationUnderFiveDaysRowDTO>[] {
  return useMemo<ColumnDef<GtVacationUnderFiveDaysRowDTO>[]>(
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
        accessorKey: 'corporateEmail',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Corporate Email" />,
        cell: ({ row }) => <span className="whitespace-normal break-all">{row.original.corporateEmail ?? EM_DASH}</span>,
        size: 220,
        meta: { headerTitle: 'Corporate Email', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'billingStatus',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Billing Status" />,
        cell: ({ row }) => <span>{row.original.billingStatus ?? EM_DASH}</span>,
        size: 130,
        meta: { headerTitle: 'Billing Status', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'gender',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Gender" />,
        cell: ({ row }) => <span>{row.original.gender ?? EM_DASH}</span>,
        size: 90,
        meta: { headerTitle: 'Gender', skeleton: <Skeleton className="h-4 w-14" /> },
      },
      {
        accessorKey: 'costCenterHierarchy',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Cost Center Hierarchy" />,
        cell: ({ row }) => <span className="whitespace-normal break-words">{row.original.costCenterHierarchy ?? EM_DASH}</span>,
        size: 200,
        meta: { headerTitle: 'Cost Center Hierarchy', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'costCenterNames',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Cost Center Names" />,
        cell: ({ row }) => <span className="whitespace-normal break-words">{row.original.costCenterNames ?? EM_DASH}</span>,
        size: 200,
        meta: { headerTitle: 'Cost Center Names', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: 'startDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) => <span>{row.original.startDate ?? EM_DASH}</span>,
        size: 120,
        meta: { headerTitle: 'Start Date', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'country',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Country" />,
        cell: ({ row }) => <span>{row.original.country ?? EM_DASH}</span>,
        size: 90,
        meta: { headerTitle: 'Country', skeleton: <Skeleton className="h-4 w-14" /> },
      },
      {
        accessorKey: 'position',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Position" />,
        cell: ({ row }) => <span className="whitespace-normal break-words">{row.original.position ?? EM_DASH}</span>,
        size: 180,
        meta: { headerTitle: 'Position', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'timeoffStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Time Off Start" />,
        cell: ({ row }) => <span>{row.original.timeoffStartDate ?? EM_DASH}</span>,
        size: 130,
        meta: { headerTitle: 'Time Off Start', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'timeoffEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Time Off End" />,
        cell: ({ row }) => <span>{row.original.timeoffEndDate ?? EM_DASH}</span>,
        size: 130,
        meta: { headerTitle: 'Time Off End', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'days',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Days" />,
        cell: ({ row }) => <span>{row.original.days ?? EM_DASH}</span>,
        size: 80,
        meta: { headerTitle: 'Days', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'typeOfTimeoff',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => <span>{row.original.typeOfTimeoff ?? EM_DASH}</span>,
        size: 150,
        meta: { headerTitle: 'Type', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <span>{row.original.status ?? EM_DASH}</span>,
        size: 120,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-20" /> },
      },
    ],
    [],
  );
}
