import { ClipboardCheck } from 'lucide-react';

interface ItemWorkflowTaskProps {
  description: string;
  taskName?: string;
  timeDisplay?: string;
  actionType?: string;
}

export default function ItemWorkflowTask({
  description,
  taskName,
  timeDisplay,
}: ItemWorkflowTaskProps) {
  return (
    <div className="flex items-start grow gap-2.5 px-5 py-3.5">
      <div className="flex items-center justify-center size-8 bg-primary/10 rounded-full border border-primary/20 shrink-0 mt-0.5">
        <ClipboardCheck className="size-4 text-primary" />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-secondary-foreground">
          {description}
        </span>
        {taskName && (
          <span className="text-xs text-muted-foreground">{taskName}</span>
        )}
        {timeDisplay && (
          <span className="text-xs font-medium text-muted-foreground">
            {timeDisplay}
          </span>
        )}
      </div>
    </div>
  );
}
