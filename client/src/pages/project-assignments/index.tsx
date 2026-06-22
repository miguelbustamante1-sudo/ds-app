import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { ProjectAssignmentWithDetailsDTO } from '@shared/dto';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/components/ui/toolbar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectComboBox } from './components/ProjectComboBox';
import { FloatingToolbar } from './components/FloatingToolbar';
import { GanttPanel } from './components/GanttPanel';
import { MemberLookupPanel } from './MemberLookupPanel';
import { useProjectAssignments } from './useProjectAssignments';
import { parseUTCDateAsLocal } from '@/lib/utils';
import { Pencil } from 'lucide-react';
import { BulkRemoveModal } from './BulkRemoveModal';
import { BulkChangeRateModal } from './BulkChangeRateModal';
import { AddMemberModal } from './AddMemberModal';
import { EditAssignmentDialog } from './EditAssignmentDialog';

const ROW_HEIGHT = 52;
const BENCH_PROJECT_ID = Number(import.meta.env.VITE_BENCH_PROJECT_ID);

export function ProjectAssignmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const projectIdParam = searchParams.get('projectId');
  const projectId = projectIdParam ? parseInt(projectIdParam, 10) || null : null;

  const { assignments, loading, loadAssignments } = useProjectAssignments(projectId);

  const [clientId, setClientId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [bulkRemoveOpen, setBulkRemoveOpen] = useState(false);
  const [bulkRateOpen, setBulkRateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ProjectAssignmentWithDetailsDTO | null>(null);

  const isBenchSelected = projectId !== null && projectId === BENCH_PROJECT_ID;
  const hasSelection = selectedIds.size > 0;

  useEffect(() => {
    loadAssignments();
    setSelectedIds(new Set());
  }, [loadAssignments]);

  const sortedAssignments = useMemo(
    () =>
      [...assignments].sort((a, b) =>
        (a.teamMemberName ?? '').localeCompare(b.teamMemberName ?? ''),
      ),
    [assignments],
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  function setProjectIdParam(val: string) {
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set('projectId', val);
    } else {
      next.delete('projectId');
    }
    setSearchParams(next, { replace: false });
  }

  function toggleSelection(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === sortedAssignments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedAssignments.map((a) => a.projectAssignmentId)));
    }
  }

  const allSelected =
    sortedAssignments.length > 0 && selectedIds.size === sortedAssignments.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < sortedAssignments.length;

  const emptyMessage =
    projectId === null ? 'Select a project above.' : 'No active members assigned.';

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Project Assignments</ToolbarPageTitle>
          <ToolbarDescription>Manage team member assignments to projects</ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="mt-6 border rounded-xl p-6">
        <MemberLookupPanel />
      </div>

      <div className="mt-6 border rounded-xl p-6">
        <p className="text-sm font-semibold mb-4">Project Assignments</p>

        <div className="max-w-sm">
          <Label>Select Project</Label>
          <ProjectComboBox
            value={projectId?.toString() ?? ''}
            onValueChange={(val) => setProjectIdParam(val)}
            onSelectFull={(project) => {
              setClientId(project?.clientId ?? null);
              setProjectName(project?.projectName ?? null);
            }}
            placeholder="Search and select a project…"
          />
        </div>

        <FloatingToolbar
          hasSelection={hasSelection}
          projectId={projectId}
          isBenchSelected={isBenchSelected}
          onRemove={() => setBulkRemoveOpen(true)}
          onChangeRate={() => setBulkRateOpen(true)}
          onAddMember={() => setAddOpen(true)}
          onAssignToProject={() => {
            // Sprint 3C: "Assign to project" flow for Bench members
          }}
        />

        {/* Split panel: left member list + right Gantt */}
        <div className="mt-4 flex border rounded-lg">
            {/* Left: member list with checkboxes */}
            <div className="w-72 shrink-0 border-r">
              {/* Column header */}
              <div
                style={{ height: ROW_HEIGHT }}
                className="flex items-center gap-3 px-4 border-b bg-muted/50"
              >
                <Checkbox
                  checked={someSelected ? 'indeterminate' : allSelected}
                  onCheckedChange={toggleAll}
                  disabled={sortedAssignments.length === 0}
                  aria-label="Select all"
                />
                <span className="text-sm font-medium text-muted-foreground">Team Member</span>
              </div>

              {/* Loading skeletons */}
              {loading && (
                <div className="divide-y">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      style={{ height: ROW_HEIGHT }}
                      className="flex items-center gap-3 px-4"
                    >
                      <Skeleton className="h-4 w-4 shrink-0" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!loading && sortedAssignments.length === 0 && (
                <div
                  style={{ height: ROW_HEIGHT }}
                  className="flex items-center px-4 text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </div>
              )}

              {/* Member rows */}
              {!loading &&
                sortedAssignments.map((a: ProjectAssignmentWithDetailsDTO) => {
                  const isEnded = a.projectAssignmentEndDate
                    ? parseUTCDateAsLocal(a.projectAssignmentEndDate) < today
                    : false;
                  return (
                  <div
                    key={a.projectAssignmentId}
                    style={{ height: ROW_HEIGHT }}
                    className={`flex items-center gap-3 px-4 border-b hover:bg-muted/30 cursor-pointer${isEnded ? ' opacity-50' : ''}`}
                    onClick={() => toggleSelection(a.projectAssignmentId)}
                  >
                    <span onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(a.projectAssignmentId)}
                        onCheckedChange={() => toggleSelection(a.projectAssignmentId)}
                        aria-label={`Select ${a.teamMemberName}`}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{a.teamMemberName}</p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          a.teamMemberSeniority,
                          a.projectAssignmentAllocation != null
                            ? `${a.projectAssignmentAllocation}%`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <span onClick={(e) => e.stopPropagation()}>
                      <button
                        className="p-1 opacity-40 hover:opacity-100 transition-opacity"
                        onClick={() => setEditingAssignment(a)}
                        aria-label="Edit assignment"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </span>
                  </div>
                  );
                })}
            </div>

            {/* Right: Gantt panel */}
            <div className="flex-1 overflow-x-auto">
              {projectId === null ? (
                <div className="flex items-center justify-center h-full min-h-[200px] text-sm text-muted-foreground">
                  Select a project to view the timeline
                </div>
              ) : (
                <GanttPanel assignments={sortedAssignments} rowHeight={ROW_HEIGHT} />
              )}
            </div>
        </div>
      </div>

      {/* Modals */}
      <BulkRemoveModal
        open={bulkRemoveOpen}
        onOpenChange={setBulkRemoveOpen}
        assignmentIds={[...selectedIds]}
        onSuccess={() => {
          setBulkRemoveOpen(false);
          setSelectedIds(new Set());
          loadAssignments();
        }}
      />

      <BulkChangeRateModal
        open={bulkRateOpen}
        onOpenChange={setBulkRateOpen}
        assignmentIds={[...selectedIds]}
        onSuccess={() => {
          setBulkRateOpen(false);
          setSelectedIds(new Set());
          loadAssignments();
        }}
      />

      {projectId !== null && (
        <AddMemberModal
          open={addOpen}
          onOpenChange={setAddOpen}
          projectId={projectId}
          clientId={clientId}
          projectName={projectName}
          onSuccess={() => {
            setAddOpen(false);
            loadAssignments();
          }}
        />
      )}

      <EditAssignmentDialog
        open={editingAssignment !== null}
        onOpenChange={(open) => { if (!open) setEditingAssignment(null); }}
        assignment={editingAssignment}
        clientId={clientId}
        onSuccess={() => {
          setEditingAssignment(null);
          loadAssignments();
        }}
      />
    </div>
  );
}
