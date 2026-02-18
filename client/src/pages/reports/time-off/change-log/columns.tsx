import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { TimeOffChangeLogRowDTO } from '@shared/dto/TimeOffChangeLog';

const EM_DASH = '—';

function renderDate(val: string | null): string {
  if (!val) return EM_DASH;
  // val is already an ISO date string (YYYY-MM-DD)
  const [y, m, d] = val.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[Number(m) - 1]} ${d}, ${y}`;
}

function renderNum(val: number | null): string {
  return val != null ? String(val) : EM_DASH;
}

function renderStr(val: string | null | undefined): string {
  return val ?? EM_DASH;
}

function statusVariant(name: string | null): 'success' | 'secondary' | 'destructive' | 'outline' {
  if (!name) return 'outline';
  const l = name.toLowerCase();
  if (l.includes('approved')) return 'success';
  if (l.includes('pending') || l.includes('tentative')) return 'secondary';
  if (l.includes('cancel') || l.includes('reject')) return 'destructive';
  return 'outline';
}

export function useChangeLogColumns(): ColumnDef<TimeOffChangeLogRowDTO>[] {
  return useMemo<ColumnDef<TimeOffChangeLogRowDTO>[]>(
    () => [
      // ── Context group ──────────────────────────────────────────────────────
      {
        accessorKey: 'changeDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Change Date" />,
        cell: ({ row }) => renderDate(row.original.changeDate),
        size: 130,
        meta: { headerTitle: 'Change Date', group: 'Context', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'changeLogId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Log ID" />,
        cell: ({ row }) => row.original.changeLogId,
        size: 80,
        meta: { headerTitle: 'Log ID', group: 'Context', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'timeOffId',
        header: ({ column }) => <DataGridColumnHeader column={column} title="T/O ID" />,
        cell: ({ row }) => row.original.timeOffId,
        size: 80,
        meta: { headerTitle: 'T/O ID', group: 'Context', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'employeeFullName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Employee" />,
        size: 200,
        meta: { headerTitle: 'Employee', group: 'Context', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'countryName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Country" />,
        size: 130,
        meta: { headerTitle: 'Country', group: 'Context', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'changedByName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Changed By" />,
        cell: ({ row }) => renderStr(row.original.changedByName),
        size: 180,
        meta: { headerTitle: 'Changed By', group: 'Context', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'comment',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Comment" />,
        cell: ({ row }) => (
          <span className="max-w-[260px] truncate block" title={row.original.comment ?? ''}>
            {renderStr(row.original.comment)}
          </span>
        ),
        size: 260,
        meta: { headerTitle: 'Comment', group: 'Context', skeleton: <Skeleton className="h-4 w-40" /> },
      },

      // ── Original group ─────────────────────────────────────────────────────
      {
        accessorKey: 'origStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Orig Start" />,
        cell: ({ row }) => renderDate(row.original.origStartDate),
        size: 120,
        meta: { headerTitle: 'Orig Start', group: 'Original', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'origEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Orig End" />,
        cell: ({ row }) => renderDate(row.original.origEndDate),
        size: 120,
        meta: { headerTitle: 'Orig End', group: 'Original', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'origDays',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Orig Days" />,
        cell: ({ row }) => renderNum(row.original.origDays),
        size: 90,
        meta: { headerTitle: 'Orig Days', group: 'Original', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'origCategory',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Orig Category" />,
        cell: ({ row }) => renderStr(row.original.origCategory),
        size: 150,
        meta: { headerTitle: 'Orig Category', group: 'Original', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'origStatus',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Orig Status" />,
        cell: ({ row }) =>
          row.original.origStatus ? (
            <Badge variant={statusVariant(row.original.origStatus)}>
              {row.original.origStatus}
            </Badge>
          ) : (
            EM_DASH
          ),
        size: 130,
        meta: { headerTitle: 'Orig Status', group: 'Original', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'origActive',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Orig Active" />,
        cell: ({ row }) => renderStr(row.original.origActive),
        size: 100,
        meta: { headerTitle: 'Orig Active', group: 'Original', skeleton: <Skeleton className="h-4 w-10" /> },
      },

      // ── New group ──────────────────────────────────────────────────────────
      {
        accessorKey: 'newStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="New Start" />,
        cell: ({ row }) => renderDate(row.original.newStartDate),
        size: 120,
        meta: { headerTitle: 'New Start', group: 'New', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'newEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="New End" />,
        cell: ({ row }) => renderDate(row.original.newEndDate),
        size: 120,
        meta: { headerTitle: 'New End', group: 'New', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'newDays',
        header: ({ column }) => <DataGridColumnHeader column={column} title="New Days" />,
        cell: ({ row }) => renderNum(row.original.newDays),
        size: 90,
        meta: { headerTitle: 'New Days', group: 'New', skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: 'newCategory',
        header: ({ column }) => <DataGridColumnHeader column={column} title="New Category" />,
        cell: ({ row }) => renderStr(row.original.newCategory),
        size: 150,
        meta: { headerTitle: 'New Category', group: 'New', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'newStatus',
        header: ({ column }) => <DataGridColumnHeader column={column} title="New Status" />,
        cell: ({ row }) =>
          row.original.newStatus ? (
            <Badge variant={statusVariant(row.original.newStatus)}>
              {row.original.newStatus}
            </Badge>
          ) : (
            EM_DASH
          ),
        size: 130,
        meta: { headerTitle: 'New Status', group: 'New', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'newActive',
        header: ({ column }) => <DataGridColumnHeader column={column} title="New Active" />,
        cell: ({ row }) => renderStr(row.original.newActive),
        size: 100,
        meta: { headerTitle: 'New Active', group: 'New', skeleton: <Skeleton className="h-4 w-10" /> },
      },
    ],
    [],
  );
}
