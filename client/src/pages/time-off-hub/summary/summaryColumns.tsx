import { ColumnDef } from '@tanstack/react-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Badge } from '@/components/ui/badge';
import { formatUTCDate } from '@/lib/utils';
import { getStatusBadgeProps } from '@/lib/badge-utils';

export interface TimeOffHubSummaryRecord {
  id: string;
  type: 'TimeOff' | 'HolidaySwap';
  recordId: number;
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
  date: string;
  endDate: string;
  categoryName?: string;
  statusId: number;
  statusName: string;
}

const TYPE_LABELS: Record<TimeOffHubSummaryRecord['type'], string> = {
  TimeOff: 'Time Off',
  HolidaySwap: 'Holiday Swap',
};

/** @param showType include the Type column/filter — only for the merged "This Week" tab */
export function buildSummaryColumns(showType: boolean): ColumnDef<TimeOffHubSummaryRecord>[] {
  const columns: ColumnDef<TimeOffHubSummaryRecord>[] = [
    {
      accessorKey: 'teamMemberNames',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Team Member" />,
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.teamMemberNames} {row.original.teamMemberSurnames}
          {row.original.workdayId ? ` (${row.original.workdayId})` : ''}
        </span>
      ),
    },
  ];

  if (showType) {
    columns.push({
      accessorKey: 'type',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
      cell: ({ row }) => <span>{TYPE_LABELS[row.original.type]}</span>,
      filterFn: (row, columnId, filterValues: string[]) =>
        filterValues.includes(row.getValue(columnId) as string),
    });
  }

  columns.push(
    {
      accessorKey: 'categoryName',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Category" />,
      cell: ({ row }) => <span>{row.original.categoryName ?? '—'}</span>,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
      cell: ({ row }) => <span>{formatUTCDate(row.original.date)}</span>,
    },
    {
      accessorKey: 'endDate',
      header: ({ column }) => <DataGridColumnHeader column={column} title="End Date" />,
      cell: ({ row }) => <span>{formatUTCDate(row.original.endDate)}</span>,
    },
    {
      accessorKey: 'statusName',
      header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const { variant, className } = getStatusBadgeProps(row.original.statusId);
        return <Badge variant={variant} className={className}>{row.original.statusName}</Badge>;
      },
      filterFn: (row, columnId, filterValues: string[]) =>
        filterValues.includes(row.getValue(columnId) as string),
    },
  );

  return columns;
}
