import { ColumnDef } from '@tanstack/react-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Badge } from '@/components/ui/badge';
import { formatUTCDate } from '@/lib/utils';
import type { TpCycleDTO } from '@/api/topPerformers/cycles';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  NOMINATIONS_OPEN: 'Nominaciones Abiertas',
  NOMINATIONS_CLOSED: 'Nominaciones Cerradas',
  VOTING_OPEN: 'Votación Abierta',
  VOTING_CLOSED: 'Votación Cerrada',
  RESULTS_PUBLISHED: 'Resultados Publicados',
};

export const cycleColumns: ColumnDef<TpCycleDTO>[] = [
  {
    accessorKey: 'cycName',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Ciclo" />,
    cell: ({ row }) => <span>{row.original.cycName}</span>,
  },
  {
    accessorKey: 'cycNominationsStart',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Inicio Nominaciones" />
    ),
    cell: ({ row }) => <span>{formatUTCDate(row.original.cycNominationsStart)}</span>,
  },
  {
    accessorKey: 'cycNominationsEnd',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Fin Nominaciones" />
    ),
    cell: ({ row }) => <span>{formatUTCDate(row.original.cycNominationsEnd)}</span>,
  },
  {
    accessorKey: 'cycVotingStart',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Inicio Votación" />
    ),
    cell: ({ row }) => <span>{formatUTCDate(row.original.cycVotingStart)}</span>,
  },
  {
    accessorKey: 'cycVotingEnd',
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Fin Votación" />
    ),
    cell: ({ row }) => <span>{formatUTCDate(row.original.cycVotingEnd)}</span>,
  },
  {
    accessorKey: 'cycStatus',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Estado" />,
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
