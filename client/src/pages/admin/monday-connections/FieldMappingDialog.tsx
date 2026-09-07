import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPut } from '@/lib/api';
import type {
  MondayConnectionDTO,
  MondayBoardColumnDTO,
  MondayFieldMapping,
  UpdateMondayConnectionDTO,
} from '@shared/dto';

interface MappingFormData {
  descriptionColumnId: string;
  priorityColumnId: string;
  dueDateColumnId: string;
  assigneeColumnId: string;
  statusColumnId: string;
}

const PRIORITY_OPTIONS: ComboBoxOption[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const STATUS_OPTIONS: ComboBoxOption[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

interface FieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: MondayConnectionDTO | null;
  onSaved: () => void;
}

export function FieldMappingDialog({ open, onOpenChange, connection, onSaved }: FieldMappingDialogProps) {
  const { toast } = useToast();
  const [columns, setColumns] = useState<MondayBoardColumnDTO[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [priorityValueMap, setPriorityValueMap] = useState<Record<string, string>>({});
  const [statusValueMap, setStatusValueMap] = useState<Record<string, string>>({});

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<MappingFormData>();

  const watchedDescription = watch('descriptionColumnId');
  const watchedPriority = watch('priorityColumnId');
  const watchedDueDate = watch('dueDateColumnId');
  const watchedAssignee = watch('assigneeColumnId');
  const watchedStatus = watch('statusColumnId');

  useEffect(() => {
    if (!open || !connection) return;

    const mapping = connection.mcdFieldMapping;
    reset({
      descriptionColumnId: mapping.descriptionColumnId ?? '',
      priorityColumnId: mapping.priorityColumnId ?? '',
      dueDateColumnId: mapping.dueDateColumnId ?? '',
      assigneeColumnId: mapping.assigneeColumnId ?? '',
      statusColumnId: mapping.statusColumnId ?? '',
    });
    setPriorityValueMap(mapping.priorityValueMap ?? {});
    setStatusValueMap(mapping.statusValueMap ?? {});

    setLoadingColumns(true);
    apiGet<MondayBoardColumnDTO[]>(`/api/monday-connections/${connection.mcdId}/columns`)
      .then(setColumns)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load board columns';
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      })
      .finally(() => setLoadingColumns(false));
  }, [open, connection, reset, toast]);

  const columnOptions = (predicate?: (c: MondayBoardColumnDTO) => boolean): ComboBoxOption[] =>
    columns
      .filter((c) => (predicate ? predicate(c) : true))
      .map((c) => ({ value: c.columnId, label: c.columnTitle }));

  const assigneeColumnOptions = columnOptions((c) => c.columnType === 'people' || c.columnType === 'email');
  const priorityColumn = columns.find((c) => c.columnId === watchedPriority);
  const statusColumn = columns.find((c) => c.columnId === watchedStatus);

  const onSubmit = async (data: MappingFormData) => {
    if (!connection) return;
    if (!data.assigneeColumnId) {
      toast({ title: 'Error', description: 'Assignee column is required', variant: 'destructive' });
      return;
    }

    const mapping: MondayFieldMapping = {
      descriptionColumnId: data.descriptionColumnId || null,
      priorityColumnId: data.priorityColumnId || null,
      priorityValueMap: data.priorityColumnId ? (priorityValueMap as MondayFieldMapping['priorityValueMap']) : undefined,
      dueDateColumnId: data.dueDateColumnId || null,
      assigneeColumnId: data.assigneeColumnId,
      statusColumnId: data.statusColumnId || null,
      statusValueMap: data.statusColumnId ? (statusValueMap as MondayFieldMapping['statusValueMap']) : undefined,
    };

    try {
      await apiPut<MondayConnectionDTO, UpdateMondayConnectionDTO>(
        `/api/monday-connections/${connection.mcdId}`,
        { mcdFieldMapping: mapping },
      );
      toast({ title: 'Success', description: 'Field mapping saved' });
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save field mapping';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Field Mapping — {connection?.mcdName}</DialogTitle>
          <DialogDescription>
            Choose which board column fills each task field. Title always comes from the Monday
            item's name and isn't mappable.
          </DialogDescription>
        </DialogHeader>

        {loadingColumns ? (
          <div className="text-muted-foreground text-sm py-4">Loading board columns...</div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
              <div>
                <Label>Title</Label>
                <p className="text-sm text-muted-foreground py-2">← Monday item name (fixed)</p>
              </div>

              <div>
                <Label>Description</Label>
                <ComboBox
                  options={columnOptions()}
                  value={watchedDescription}
                  onValueChange={(value) => setValue('descriptionColumnId', value)}
                  placeholder="None"
                />
              </div>

              <div>
                <Label>Priority</Label>
                <ComboBox
                  options={columnOptions()}
                  value={watchedPriority}
                  onValueChange={(value) => setValue('priorityColumnId', value)}
                  placeholder="None"
                />
                {priorityColumn?.options && priorityColumn.options.length > 0 && (
                  <div className="mt-2 space-y-2 rounded-md border p-3">
                    {priorityColumn.options.map((label) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-sm flex-1">{label}</span>
                        <ComboBox
                          options={PRIORITY_OPTIONS}
                          value={priorityValueMap[label] ?? ''}
                          onValueChange={(value) =>
                            setPriorityValueMap((prev) => ({ ...prev, [label]: value }))
                          }
                          placeholder="Map to..."
                          className="w-40"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label>Due Date</Label>
                <ComboBox
                  options={columnOptions()}
                  value={watchedDueDate}
                  onValueChange={(value) => setValue('dueDateColumnId', value)}
                  placeholder="None"
                />
              </div>

              <div>
                <Label>
                  Assignee <span className="text-destructive">*</span>
                </Label>
                <ComboBox
                  options={assigneeColumnOptions}
                  value={watchedAssignee}
                  onValueChange={(value) => setValue('assigneeColumnId', value)}
                  placeholder="Select a person or email column..."
                />
              </div>

              <div>
                <Label>Status</Label>
                <ComboBox
                  options={columnOptions()}
                  value={watchedStatus}
                  onValueChange={(value) => setValue('statusColumnId', value)}
                  placeholder="None"
                />
                {statusColumn?.options && statusColumn.options.length > 0 && (
                  <div className="mt-2 space-y-2 rounded-md border p-3">
                    {statusColumn.options.map((label) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-sm flex-1">{label}</span>
                        <ComboBox
                          options={STATUS_OPTIONS}
                          value={statusValueMap[label] ?? ''}
                          onValueChange={(value) =>
                            setStatusValueMap((prev) => ({ ...prev, [label]: value }))
                          }
                          placeholder="Map to..."
                          className="w-40"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Mapping'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
