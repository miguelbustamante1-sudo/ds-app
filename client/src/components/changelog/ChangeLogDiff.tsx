// client/src/components/changelog/ChangeLogDiff.tsx
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatUTCDate } from '@/lib/utils';
import { buildFieldDiff, type FieldMapEntry } from '@/lib/changelog/buildFieldDiff';
import type { ChangeLogAction } from '@/lib/changelog/deriveActionBadge';

const ACTION_BADGE_VARIANT: Record<ChangeLogAction, 'success' | 'secondary' | 'destructive' | 'primary' | 'info'> = {
  Created: 'success',
  Updated: 'primary',
  Cancelled: 'secondary',
  Approved: 'success',
  Rejected: 'destructive',
};

export interface ChangeLogDiffProps {
  action: ChangeLogAction;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  fieldMap: FieldMapEntry[];
  comment: string;
  createdByUserName: string | null;
  createdDate: string | Date | null;
}

export function ChangeLogDiff({
  action,
  oldValues,
  newValues,
  fieldMap,
  comment,
  createdByUserName,
  createdDate,
}: ChangeLogDiffProps) {
  const [open, setOpen] = useState(false);
  const lines = useMemo(() => buildFieldDiff(oldValues, newValues, fieldMap), [oldValues, newValues, fieldMap]);
  const hasDetail = lines.length > 0 || (oldValues === null && newValues === null);

  return (
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <Badge variant={ACTION_BADGE_VARIANT[action]}>{action}</Badge>
      </div>
      <p className="text-sm">{comment}</p>
      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
        {createdByUserName && <span>{createdByUserName}</span>}
        {createdDate && (
          <>
            {createdByUserName && <span className="rounded-full size-1 bg-muted-foreground/50" />}
            <span>{formatUTCDate(createdDate, 'dd-MMM-yyyy HH:mm')}</span>
          </>
        )}
      </div>
      {lines.length > 0 && (
        <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
          <CollapsibleTrigger className="text-xs font-medium text-primary hover:underline">
            {open ? 'Hide' : action === 'Created' ? 'Change details' : `${lines.length} change${lines.length === 1 ? '' : 's'}`}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {lines.map((line) => (
                <li key={line.label}>
                  <span className="font-medium text-foreground">{line.label}</span>
                  {action === 'Created' ? (
                    <> — New: {line.newDisplay}</>
                  ) : (
                    <> — Old: {line.oldDisplay}, New: {line.newDisplay}</>
                  )}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
      {lines.length === 0 && !hasDetail && (
        <p className="mt-2 text-xs text-muted-foreground italic">No detail available</p>
      )}
    </div>
  );
}
