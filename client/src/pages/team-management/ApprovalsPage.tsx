import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Check, X as XIcon } from 'lucide-react';
import type { TeamMemberChangeRequestDTO, ReviewTeamMemberChangeRequestDTO } from '@shared/dto';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPatch, ApiError } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';

const FIELD_LABELS: Record<string, string> = {
  tierBandId: 'Tier/Band',
  teamMemberPrimaryRole: 'Primary Role',
  teamMemberFullLegalName: 'Full Legal Name',
  teamMemberEndDate: 'Last Working Day',
};

function summarizeChanges(changes: TeamMemberChangeRequestDTO['changes']): string {
  return Object.entries(changes)
    .map(([field, { old, new: newValue }]) => `${FIELD_LABELS[field] ?? field}: ${old ?? '—'} → ${newValue ?? '—'}`)
    .join('; ');
}

export function TeamManagementApprovalsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<TeamMemberChangeRequestDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await apiGet<TeamMemberChangeRequestDTO[]>('/api/team-management/change-requests/pending');
      setRequests(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load pending change requests';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleReview = async (id: number, action: 'approve' | 'reject') => {
    setBusyId(id);
    try {
      const payload: ReviewTeamMemberChangeRequestDTO = {};
      await apiPatch(`/api/team-management/change-requests/${id}/${action}`, payload);
      toast({ title: 'Success', description: `Change request ${action === 'approve' ? 'approved' : 'rejected'}.` });
      loadRequests();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : `Failed to ${action} change request`;
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const columns = useMemo<ColumnDef<TeamMemberChangeRequestDTO>[]>(
    () => [
      {
        id: 'teamMember',
        accessorFn: (row) => `${row.teamMemberNames} ${row.teamMemberSurnames}`,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Team Member" />,
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.teamMemberNames} {row.original.teamMemberSurnames}
          </span>
        ),
        size: 200,
        meta: { headerTitle: 'Team Member', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <Badge variant={row.original.type === 'attrition' ? 'destructive' : 'primary'}>
            {row.original.type === 'attrition' ? 'Attrition' : 'Edit'}
          </Badge>
        ),
        size: 110,
        meta: { headerTitle: 'Type', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        id: 'changes',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Requested Change" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{summarizeChanges(row.original.changes)}</span>
        ),
        enableSorting: false,
        size: 300,
        meta: { headerTitle: 'Requested Change', skeleton: <Skeleton className="h-4 w-48" /> },
      },
      {
        id: 'requestedBy',
        accessorFn: (row) => row.requestedByName ?? '',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Requested By" />,
        cell: ({ row }) => row.original.requestedByName ?? '—',
        size: 160,
        meta: { headerTitle: 'Requested By', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'requestedAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Requested At" />,
        cell: ({ row }) => formatUTCDate(row.original.requestedAt),
        size: 130,
        meta: { headerTitle: 'Requested At', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={busyId === row.original.changeRequestId}
              onClick={() => handleReview(row.original.changeRequestId, 'approve')}
            >
              <Check size={16} className="me-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busyId === row.original.changeRequestId}
              onClick={() => handleReview(row.original.changeRequestId, 'reject')}
            >
              <XIcon size={16} className="me-1" />
              Reject
            </Button>
          </div>
        ),
        size: 220,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right', skeleton: <Skeleton className="h-8 w-40 ml-auto" /> },
      },
    ],
    [busyId],
  );

  const table = useReactTable({
    data: requests,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/team-management')} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <ToolbarPageTitle>Change Approvals</ToolbarPageTitle>
              <ToolbarDescription>Review sensitive team-member changes and attrition requests</ToolbarDescription>
            </div>
          </div>
        </ToolbarHeading>
      </Toolbar>

      {loading ? (
        <div className="text-muted-foreground text-sm py-4">Loading...</div>
      ) : (
        <DataGridContainer className="mt-6">
          <DataGrid
            table={table}
            recordCount={requests.length}
            emptyMessage="No pending change requests."
            tableLayout={{ columnsMovable: true, columnsVisibility: true }}
          >
            <DataGridTable />
            <DataGridPagination sizes={[10, 25, 50]} />
          </DataGrid>
        </DataGridContainer>
      )}
    </div>
  );
}
