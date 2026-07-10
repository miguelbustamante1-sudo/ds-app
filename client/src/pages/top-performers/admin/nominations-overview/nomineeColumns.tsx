import type { ColumnDef } from '@tanstack/react-table';
import type { TpNominationAdminDTO } from '@/api/topPerformers/nominations';

const TYPE_LABELS: Record<string, string> = {
  PEER: 'Peer',
  ADMIN: 'Admin',
  CUSTOMER: 'Customer',
};

export function buildNominationColumns(
  onRowClick: (row: TpNominationAdminDTO) => void
): ColumnDef<TpNominationAdminDTO>[] {
  return [
    {
      id: 'nomineeName',
      header: 'Nominee',
      cell: ({ row }) => (
        <button
          className="text-left hover:underline font-medium"
          onClick={() => onRowClick(row.original)}
        >
          {row.original.nomineeName}
        </button>
      ),
    },
    {
      id: 'nomType',
      header: 'Type',
      cell: ({ row }) => TYPE_LABELS[row.original.nomType] ?? row.original.nomType,
    },
    {
      accessorKey: 'nomAnonymizationStatus',
      header: 'Anonymization',
    },
    {
      accessorKey: 'nomStatus',
      header: 'Status',
    },
  ];
}
