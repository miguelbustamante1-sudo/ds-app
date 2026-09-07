import { ColumnDef } from '@tanstack/react-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, ArrowRightCircle } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
import { TP_CYCLE_STATUSES } from '@shared/dto/TopPerformersCycle';
import type { TpCycleDTO, TpCycleStatus } from '@/api/topPerformers/cycles';

// Extend TanStack Table meta type so TypeScript accepts our callbacks
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData> {
    onEdit: (cycle: TpCycleDTO) => void;
    onAdvance: (cycle: TpCycleDTO) => void;
  }
}

export const STATUS_LABELS: Record<TpCycleStatus, string> = {
  DRAFT: 'Draft',
  NOMINATIONS_OPEN: 'Nominations Open',
  NOMINATIONS_CLOSED: 'Nominations Closed',
  VOTING_OPEN: 'Voting Open',
  VOTING_CLOSED: 'Voting Closed',
  RESULTS_PUBLISHED: 'Results Published',
};

// Maps each status to the next one in the progression (terminal status has no entry)
export const NEXT_STATUS: Partial<Record<TpCycleStatus, TpCycleStatus>> = {};
for (let i = 0; i < TP_CYCLE_STATUSES.length - 1; i++) {
  NEXT_STATUS[TP_CYCLE_STATUSES[i]] = TP_CYCLE_STATUSES[i + 1];
}

const NEXT_STATUS_LABEL: Partial<Record<TpCycleStatus, string>> = {
  DRAFT: 'Open Nominations',
  NOMINATIONS_OPEN: 'Close Nominations',
  NOMINATIONS_CLOSED: 'Open Voting',
  VOTING_OPEN: 'Close Voting',
  VOTING_CLOSED: 'Publish Results',
};

export const cycleColumns: ColumnDef<TpCycleDTO>[] = [
  {
    accessorKey: 'cycName',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Cycle" />,
    cell: ({ row }) => <span className="font-medium">{row.original.cycName}</span>,
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
  {
    id: 'actions',
    header: () => <span className="text-xs text-muted-foreground">Actions</span>,
    cell: ({ row, table }) => {
      const nextLabel = NEXT_STATUS_LABEL[row.original.cycStatus];
      return (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            title="Edit cycle"
            onClick={(e) => {
              e.stopPropagation();
              table.options.meta?.onEdit(row.original);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {nextLabel && (
            <Button
              size="icon"
              variant="ghost"
              title={nextLabel}
              onClick={(e) => {
                e.stopPropagation();
                table.options.meta?.onAdvance(row.original);
              }}
            >
              <ArrowRightCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    },
  },
];
