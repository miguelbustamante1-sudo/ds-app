import { Trash2, DollarSign, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FloatingToolbarProps {
  hasSelection: boolean;
  projectId: number | null;
  isBenchSelected: boolean;
  /** FR-012 — false when the caller lacks modify rights on the selected project (view-only). */
  canModify: boolean;
  onRemove: () => void;
  onChangeRate: () => void;
  onAddMember: () => void;
  onAssignToProject: () => void;
}

export function FloatingToolbar({
  hasSelection,
  projectId,
  isBenchSelected,
  canModify,
  onRemove,
  onChangeRate,
  onAddMember,
  onAssignToProject,
}: FloatingToolbarProps) {
  return (
    <div className="sticky top-0 z-10 bg-background border-b mt-4 py-2 flex gap-2 items-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="icon"
                variant="outline"
                disabled={!hasSelection || !canModify}
                onClick={onRemove}
                aria-label="Remove from project"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Remove from project</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="icon"
                variant="outline"
                disabled={!hasSelection || !canModify}
                onClick={onChangeRate}
                aria-label="Change bill rate"
              >
                <DollarSign className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Change bill rate</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="icon"
                variant="outline"
                disabled={projectId === null || !canModify}
                onClick={onAddMember}
                aria-label="Add team member"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Add team member</TooltipContent>
        </Tooltip>

        {isBenchSelected && (
          <Button size="sm" onClick={onAssignToProject} disabled={!canModify}>
            Assign to project
          </Button>
        )}
      </TooltipProvider>
    </div>
  );
}
