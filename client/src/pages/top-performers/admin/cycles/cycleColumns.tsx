import { ColumnDef } from '@tanstack/react-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Badge } from '@/components/ui/badge';
import { formatUTCDate } from '@/lib/utils';
import type { TpCycleDTO } from '@/api/topPerformers/cycles';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  NOMINATIONS_OPEN: 'Nominations Open',
  NOMINATIONS_CLOSED: 'Nominations Closed',
  VOTING_OPEN: 'Voting Open',
  VOTING_CLOSED: 'Voting Closed',
  RESULTS_PUBLISHED: 'Results Published',
};

export const cycleColumns: ColumnDef<TpCycleDTO>[] = [
  {
    accessorKey: 'cycName',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Cycle" />,
    cell: ({ row }) => <span>{row.original.cycName}</span>,
  },
  {
    accessorKey: 'cycNominationsStart',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Nominations Start" />
    ),
    cell: ({ row }) => <span>{formatUTCDate(row.original.cycNominationsStart)}</span>,
  },
  {
    accessorKey: 'cycNominationsEnd',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Nominations End" />
    ),
    cell: ({ row }) => <span>{formatUTCDate(row.original.cycNominationsEnd)}</span>,
  },
  {
    accessorKey: 'cycVotingStart',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Voting Start" />
    ),
    cell: ({ row }) => <span>{formatUTCDate(row.original.cycVotingStart)}</span>,
  },
  {
    accessorKey: 'cycVotingEnd',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Voting End" />
    ),
    cell: ({ row }) => <span>{formatUTCDate(row.original.cycVotingEnd)}</span>,
  },
  {
    accessorKey: 'cycStatus',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <Badge variant="outline">
        {STATUS_LABELS[row.original.cycStatus] ?? row.original.cycStatus}
      </Badge>
    ),
    filterFn: (row, _id, value: string[]) => {
      if (!value.length) return true;
      return value.includes(row.original.cycStatus);
    },
  },
];
