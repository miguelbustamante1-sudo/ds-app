import type { ColumnDef } from '@tanstack/react-table';
import type { LeaderboardEntry } from '@/api/topPerformers/results';

export function buildLeaderboardColumns(
  onRowClick: (entry: LeaderboardEntry) => void
): ColumnDef<LeaderboardEntry>[] {
  return [
    {
      id: 'position',
      header: 'Pos.',
      cell: ({ row }) => {
        const pos = row.index + 1;
        return <span className={`font-bold ${pos <= 5 ? 'text-yellow-600' : ''}`}>{pos}</span>;
      },
    },
    {
      id: 'name',
      header: 'Team Member',
      cell: ({ row }) => (
        <button
          className="text-left hover:underline font-medium"
          onClick={() => onRowClick(row.original)}
        >
          {row.original.nomineeNames} {row.original.nomineeSurnames}
        </button>
      ),
    },
    { accessorKey: 'totalRawPoints', header: 'Raw Points' },
    {
      accessorKey: 'totalWeightedPoints',
      header: 'Weighted Points',
      cell: ({ row }) => <span className="font-semibold">{row.original.totalWeightedPoints}</span>,
    },
    { accessorKey: 'totalVotesReceived', header: 'Votes' },
    { accessorKey: 'totalNominationsReceived', header: 'Nominations' },
  ];
}
