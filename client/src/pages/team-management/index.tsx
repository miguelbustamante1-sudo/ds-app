import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Pencil, UserMinus, Search } from 'lucide-react';
import type { MyTeamMemberForManagementDTO } from '@shared/dto';
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
  ToolbarActions,
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiGet, ApiError } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import { EditMemberDialog } from './EditMemberDialog';
import { AttritionDialog } from './AttritionDialog';

export function TeamManagementPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canCreate } = usePermissions();

  const [team, setTeam] = useState<MyTeamMemberForManagementDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [editingMember, setEditingMember] = useState<MyTeamMemberForManagementDTO | null>(null);
  const [attritionMember, setAttritionMember] = useState<MyTeamMemberForManagementDTO | null>(null);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const data = await apiGet<MyTeamMemberForManagementDTO[]>('/api/team-management/my-team');
      setTeam(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load your team';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const columns = useMemo<ColumnDef<MyTeamMemberForManagementDTO>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => `${row.teamMemberNames} ${row.teamMemberSurnames}`,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.teamMemberNames} {row.original.teamMemberSurnames}
          </span>
        ),
        size: 200,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'teamMemberKnownAs',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Known As" />,
        cell: ({ row }) => row.original.teamMemberKnownAs || '-',
        size: 120,
        meta: { headerTitle: 'Known As', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'roleName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Role" />,
        cell: ({ row }) => row.original.roleName ?? '-',
        size: 150,
        meta: { headerTitle: 'Role', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'tierBandDescription',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Tier Band" />,
        cell: ({ row }) => row.original.tierBandDescription ?? '-',
        size: 120,
        meta: { headerTitle: 'Tier Band', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'shiftDescription',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Shift" />,
        cell: ({ row }) => row.original.shiftDescription ?? '-',
        size: 120,
        meta: { headerTitle: 'Shift', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        id: 'project',
        accessorFn: (row) => row.activeAssignment?.projectName ?? '',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Project" />,
        cell: ({ row }) => row.original.activeAssignment?.projectName ?? '-',
        size: 160,
        meta: { headerTitle: 'Project', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        accessorKey: 'teamMemberEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const m = row.original;
          if (m.teamMemberEndDate) {
            return <Badge variant="destructive">Ending {formatUTCDate(m.teamMemberEndDate)}</Badge>;
          }
          if (m.hasPendingChangeRequest) {
            return <Badge variant="warning">Change pending</Badge>;
          }
          return <Badge variant="success">Active</Badge>;
        },
        size: 150,
        meta: { headerTitle: 'Status', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canCreate('TeamMembers') && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditingMember(row.original)}>
                  <Pencil size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAttritionMember(row.original)}
                  disabled={!!row.original.teamMemberEndDate}
                >
                  <UserMinus size={16} className="text-destructive" />
                </Button>
              </>
            )}
          </div>
        ),
        size: 100,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right', skeleton: <Skeleton className="h-8 w-20 ml-auto" /> },
      },
    ],
    [canCreate],
  );

  const table = useReactTable({
    data: team,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Team Management</ToolbarPageTitle>
          <ToolbarDescription>Manage your direct and indirect reports</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('TeamMembers') && (
            <Button variant="outline" onClick={() => navigate('/team-management/approvals')}>
              Change Approvals
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search your team..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm py-4">Loading...</div>
      ) : (
        <DataGridContainer className="mt-4">
          <DataGrid
            table={table}
            recordCount={team.length}
            emptyMessage="No reports found."
            tableLayout={{ columnsMovable: true, columnsVisibility: true }}
          >
            <DataGridTable />
            <DataGridPagination sizes={[10, 25, 50]} />
          </DataGrid>
        </DataGridContainer>
      )}

      {editingMember && (
        <EditMemberDialog
          open={!!editingMember}
          onOpenChange={(open) => !open && setEditingMember(null)}
          member={editingMember}
          onSuccess={() => {
            setEditingMember(null);
            loadTeam();
          }}
        />
      )}

      {attritionMember && (
        <AttritionDialog
          open={!!attritionMember}
          onOpenChange={(open) => !open && setAttritionMember(null)}
          member={attritionMember}
          onSuccess={() => {
            setAttritionMember(null);
            loadTeam();
          }}
        />
      )}
    </div>
  );
}
