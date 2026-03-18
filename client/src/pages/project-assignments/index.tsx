import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Plus } from 'lucide-react';
import type { ProjectAssignmentWithDetailsDTO } from '@shared/dto';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/components/ui/toolbar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUTCDate } from '@/lib/utils';
import { ProjectComboBox } from './components/ProjectComboBox';
import { useProjectAssignments } from './useProjectAssignments';
import { ChangeRateDialog } from './ChangeRateDialog';
import { RemoveMemberDialog } from './RemoveMemberDialog';
import { AddMemberDialog } from './AddMemberDialog';

type TabValue = 'change-rate' | 'remove' | 'add';

export function ProjectAssignmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') ?? 'change-rate') as TabValue;
  const projectIdParam = searchParams.get('projectId');
  const projectId = projectIdParam ? parseInt(projectIdParam, 10) || null : null;

  const { assignments, loading, loadAssignments } = useProjectAssignments(projectId);

  const [clientId, setClientId] = useState<number | null>(null);

  const [changeRateOpen, setChangeRateOpen] = useState(false);
  const [changeRateRow, setChangeRateRow] = useState<ProjectAssignmentWithDetailsDTO | null>(null);

  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeRow, setRemoveRow] = useState<ProjectAssignmentWithDetailsDTO | null>(null);

  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  function handleTabChange(value: string) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next, { replace: false });
  }

  function setProjectIdParam(val: string) {
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set('projectId', val);
    } else {
      next.delete('projectId');
    }
    setSearchParams(next, { replace: false });
  }

  const baseColumns = useMemo<ColumnDef<ProjectAssignmentWithDetailsDTO>[]>(
    () => [
      {
        id: 'teamMemberName',
        accessorFn: (row) => row.teamMemberName ?? '',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Team Member" />,
        size: 200,
        meta: { headerTitle: 'Team Member', skeleton: <Skeleton className="h-4 w-36" /> },
      },
      {
        accessorKey: 'teamMemberSeniority',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Seniority" />,
        cell: ({ row }) => row.original.teamMemberSeniority ?? '-',
        size: 130,
        meta: { headerTitle: 'Seniority', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'projectAssignmentStartDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Start Date" />,
        cell: ({ row }) =>
          row.original.projectAssignmentStartDate
            ? formatUTCDate(row.original.projectAssignmentStartDate)
            : '-',
        size: 130,
        meta: { headerTitle: 'Start Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'projectAssignmentEndDate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="End Date" />,
        cell: ({ row }) =>
          row.original.projectAssignmentEndDate
            ? formatUTCDate(row.original.projectAssignmentEndDate)
            : '–',
        size: 130,
        meta: { headerTitle: 'End Date', skeleton: <Skeleton className="h-4 w-24" /> },
      },
      {
        accessorKey: 'projectAssignmentBillRate',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Bill Rate" />,
        cell: ({ row }) => {
          const rate = row.original.projectAssignmentBillRate;
          const currency = row.original.projectAssignmentBillRateCurrency ?? '';
          return rate != null ? `${currency} ${rate}` : '-';
        },
        size: 130,
        meta: { headerTitle: 'Bill Rate', skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: 'projectAssignmentAllocation',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Allocation" />,
        cell: ({ row }) =>
          row.original.projectAssignmentAllocation != null
            ? `${row.original.projectAssignmentAllocation}%`
            : '-',
        size: 110,
        meta: { headerTitle: 'Allocation', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'clientContactName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Contact" />,
        cell: ({ row }) => row.original.clientContactName ?? '–',
        size: 160,
        meta: { headerTitle: 'Contact', skeleton: <Skeleton className="h-4 w-28" /> },
      },
    ],
    [],
  );

  const changeRateColumns = useMemo<ColumnDef<ProjectAssignmentWithDetailsDTO>[]>(
    () => [
      ...baseColumns,
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setChangeRateRow(row.original);
              setChangeRateOpen(true);
            }}
          >
            Change Rate
          </Button>
        ),
        size: 130,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right', skeleton: <Skeleton className="h-8 w-28 ml-auto" /> },
      },
    ],
    [baseColumns],
  );

  const removeColumns = useMemo<ColumnDef<ProjectAssignmentWithDetailsDTO>[]>(
    () => [
      ...baseColumns,
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => {
              setRemoveRow(row.original);
              setRemoveOpen(true);
            }}
          >
            Remove
          </Button>
        ),
        size: 100,
        enableSorting: false,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right', skeleton: <Skeleton className="h-8 w-20 ml-auto" /> },
      },
    ],
    [baseColumns],
  );

  const addColumns = useMemo<ColumnDef<ProjectAssignmentWithDetailsDTO>[]>(
    () => baseColumns,
    [baseColumns],
  );

  const changeRateTable = useReactTable({
    data: assignments,
    columns: changeRateColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const removeTable = useReactTable({
    data: assignments,
    columns: removeColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const addTable = useReactTable({
    data: assignments,
    columns: addColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const emptyMessage = projectId === null
    ? 'Select a project above to manage its team members.'
    : 'No active team members assigned to this project.';

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Project Assignments</ToolbarPageTitle>
          <ToolbarDescription>Manage team member assignments to projects</ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6 max-w-sm">
        <Label>Select Project</Label>
        <ProjectComboBox
          value={projectId?.toString() ?? ''}
          onValueChange={(val) => setProjectIdParam(val)}
          onSelectFull={(project) => setClientId(project?.clientId ?? null)}
          placeholder="Search and select a project…"
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-6">
        <TabsList variant="line">
          <TabsTrigger value="change-rate">Change Rate</TabsTrigger>
          <TabsTrigger value="remove">Remove Team Member</TabsTrigger>
          <TabsTrigger value="add">Add Team Member</TabsTrigger>
        </TabsList>

        <TabsContent value="change-rate">
          <DataGridContainer className="mt-4">
            <DataGrid
              table={changeRateTable}
              recordCount={assignments.length}
              isLoading={loading}
              emptyMessage={emptyMessage}
              tableLayout={{ width: 'fixed', columnsResizable: true }}
            >
              <DataGridTable />
              <DataGridPagination sizes={[10, 25, 50]} />
            </DataGrid>
          </DataGridContainer>
        </TabsContent>

        <TabsContent value="remove">
          <DataGridContainer className="mt-4">
            <DataGrid
              table={removeTable}
              recordCount={assignments.length}
              isLoading={loading}
              emptyMessage={emptyMessage}
              tableLayout={{ width: 'fixed', columnsResizable: true }}
            >
              <DataGridTable />
              <DataGridPagination sizes={[10, 25, 50]} />
            </DataGrid>
          </DataGridContainer>
        </TabsContent>

        <TabsContent value="add">
          <div className="mt-4 mb-3">
            <Button
              size="sm"
              disabled={projectId === null}
              onClick={() => setAddOpen(true)}
            >
              <Plus className="me-1" size={16} />
              Add Team Member
            </Button>
          </div>
          <DataGridContainer>
            <DataGrid
              table={addTable}
              recordCount={assignments.length}
              isLoading={loading}
              emptyMessage={emptyMessage}
              tableLayout={{ width: 'fixed', columnsResizable: true }}
            >
              <DataGridTable />
              <DataGridPagination sizes={[10, 25, 50]} />
            </DataGrid>
          </DataGridContainer>
        </TabsContent>
      </Tabs>

      <ChangeRateDialog
        open={changeRateOpen}
        onOpenChange={setChangeRateOpen}
        assignment={changeRateRow}
        onSuccess={() => {
          setChangeRateOpen(false);
          loadAssignments();
        }}
      />

      <RemoveMemberDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        assignment={removeRow}
        onSuccess={() => {
          setRemoveOpen(false);
          loadAssignments();
        }}
      />

      {projectId !== null && (
        <AddMemberDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          projectId={projectId}
          clientId={clientId}
          onSuccess={() => {
            setAddOpen(false);
            loadAssignments();
          }}
        />
      )}
    </div>
  );
}
