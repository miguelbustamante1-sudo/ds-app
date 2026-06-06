import { useEffect, useMemo, useState } from 'react';
import { Settings2, X } from 'lucide-react';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from '@tanstack/react-table';
import type { AuthUserWithRolesDTO, SecurityRoleDTO } from '@shared/dto';
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
import { DataGridColumnFilter } from '@/components/ui/data-grid-column-filter';
import { Input } from '@/components/ui/input';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getAuthUsersWithRoles, getRoles } from '@/services/security';
import { formatUTCDate } from '@/lib/utils';
import { ManageUserRolesDialog } from './manage-dialog';

export function UserRolesPage() {
  const [users, setUsers] = useState<AuthUserWithRolesDTO[]>([]);
  const [allRoles, setAllRoles] = useState<SecurityRoleDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AuthUserWithRolesDTO | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { toast } = useToast();
  const { canRead, canCreate } = usePermissions();

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        getAuthUsersWithRoles(),
        getRoles(),
      ]);
      setUsers(usersData);
      setAllRoles(rolesData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManage = (user: AuthUserWithRolesDTO) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDialogSuccess = (updatedUser: AuthUserWithRolesDTO) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    setSelectedUser(updatedUser);
  };

  const roleOptions = useMemo(
    () => allRoles.map((r) => ({ value: r.roleName, label: r.roleName })),
    [allRoles],
  );

  const columns = useMemo<ColumnDef<AuthUserWithRolesDTO>[]>(
    () => [
      {
        accessorKey: 'email',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Email" />,
        filterFn: (row, _, filterValue: string) =>
          row.original.email.toLowerCase().includes(filterValue.toLowerCase()),
        size: 260,
        meta: { headerTitle: 'Email', skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        id: 'name',
        accessorFn: (row) =>
          row.firstName || row.lastName
            ? `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim()
            : '-',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        size: 200,
        meta: { headerTitle: 'Name', skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        accessorKey: 'lastLogin',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Last Login" />,
        cell: ({ row }) =>
          row.original.lastLogin ? formatUTCDate(row.original.lastLogin) : '-',
        size: 150,
        meta: { headerTitle: 'Last Login', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        id: 'assignedRoles',
        accessorFn: (row) => row.assignedRoles.map((r) => r.roleName),
        header: ({ column }) => <DataGridColumnHeader column={column} title="Assigned Roles" />,
        cell: ({ row }) =>
          row.original.assignedRoles.length === 0 ? (
            <span className="text-muted-foreground text-sm">No roles</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {row.original.assignedRoles.map((r) => (
                <Badge key={r.roleId} variant="secondary">
                  {r.roleName}
                </Badge>
              ))}
            </div>
          ),
        filterFn: (row, _, filterValues: string[]) =>
          row.original.assignedRoles.some((r) => filterValues.includes(r.roleName)),
        size: 280,
        enableSorting: false,
        meta: { headerTitle: 'Assigned Roles', skeleton: <Skeleton className="h-4 w-48" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          canCreate('RBACUserRoles') ? (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => handleManage(row.original)}>
                <Settings2 size={16} />
              </Button>
            </div>
          ) : null,
        size: 80,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-8 ml-auto" />,
        },
      },
    ],
    [canCreate],
  );

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canRead('RBACUserRoles')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>User Roles</ToolbarPageTitle>
          <ToolbarDescription>Assign roles to users</ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="flex items-center gap-2 mt-6">
        <Input
          placeholder="Search by email..."
          value={(table.getColumn('email')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('email')?.setFilterValue(e.target.value)}
          className="h-8 w-[220px]"
        />
        <DataGridColumnFilter
          column={table.getColumn('assignedRoles')}
          title="Role"
          options={roleOptions}
        />
        {columnFilters.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          isLoading={loading}
          emptyMessage="No users found."
          tableLayout={{
            width: 'fixed',
            columnsResizable: true,
            columnsMovable: true,
            columnsVisibility: true,
          }}
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <ManageUserRolesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        allRoles={allRoles}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
