import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ComboBox } from '@/components/ui/combobox';
import type { ComboBoxOption } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { ActingAsUserDTO } from '@shared/dto/HolidaySwap';
import type { WtkWorkflowTemplateTask, WtnWorkflowTemplateNotification } from '../types';

interface NotificationFormData {
  eventType: string;
  recipientType: string;
  recipientUserId: string;
  recipientRoleId: string;
  recipientDynamicType: string;
  messageTemplate: string;
  emailTemplate: string;
  slackTemplate: string;
  isActive: boolean;
}

interface TaskNotificationPanelProps {
  wflId: string;
  task: WtkWorkflowTemplateTask;
  onRefresh: () => void;
  canEdit: boolean;
}

const EVENT_TYPE_OPTIONS: ComboBoxOption[] = [
  { value: 'ON_ASSIGNMENT', label: 'On Assignment' },
  { value: 'ON_REASSIGNMENT', label: 'On Reassignment' },
  { value: 'ON_REMINDER', label: 'On Reminder' },
  { value: 'ON_ESCALATION', label: 'On Escalation' },
  { value: 'ON_NO_RESPONSIBLE_FOUND', label: 'On No Responsible Found' },
];

const RECIPIENT_TYPE_OPTIONS: ComboBoxOption[] = [
  { value: 'USER', label: 'User' },
  { value: 'ROLE', label: 'Role' },
  { value: 'DYNAMIC', label: 'Dynamic' },
];

const DYNAMIC_RECIPIENT_OPTIONS: ComboBoxOption[] = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'FIRST_SUPERVISOR', label: 'First Supervisor' },
  { value: 'ASSIGNEE', label: 'Assignee' },
];

export function TaskNotificationPanel({ wflId, task, onRefresh, canEdit }: TaskNotificationPanelProps) {
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState<WtnWorkflowTemplateNotification | undefined>();
  const [sheetMode, setSheetMode] = useState<'view' | 'edit' | 'create'>('create');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [userOptions, setUserOptions] = useState<ComboBoxOption[]>([]);

  const notifications = task.notifications ?? [];

  useEffect(() => {
    if (!drawerOpen) return;
    apiGet<ActingAsUserDTO[]>('/api/workflow/users')
      .then((users) => {
        setUserOptions(
          users.map((u) => ({
            value: u.userId.toString(),
            label: u.workdayId ? `${u.fullName} (${u.workdayId})` : u.fullName,
          })),
        );
      })
      .catch(() => {
        // silently ignore — the ComboBox will just show no options
      });
  }, [drawerOpen]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NotificationFormData>({
    defaultValues: {
      eventType: '', recipientType: '',
      recipientUserId: '', recipientRoleId: '', recipientDynamicType: '',
      messageTemplate: '', emailTemplate: '', slackTemplate: '', isActive: true,
    },
  });

  useEffect(() => {
    if (drawerOpen) {
      reset({
        eventType: editingNotif?.eventType ?? '',
        recipientType: editingNotif?.recipientType ?? '',
        recipientUserId: editingNotif?.recipientUserId ?? '',
        recipientRoleId: editingNotif?.recipientRoleId ?? '',
        recipientDynamicType: editingNotif?.recipientDynamicType ?? '',
        messageTemplate: editingNotif?.messageTemplate ?? '',
        emailTemplate: editingNotif?.emailTemplate ?? '',
        slackTemplate: editingNotif?.slackTemplate ?? '',
        isActive: editingNotif?.isActive ?? true,
      });
    }
  }, [drawerOpen, editingNotif, reset]);

  const watchedRecipientType = watch('recipientType');

  const handleAdd = () => {
    setEditingNotif(undefined);
    setSheetMode('create');
    setDrawerOpen(true);
  };

  const handleEdit = (notif: WtnWorkflowTemplateNotification) => {
    setEditingNotif(notif);
    setSheetMode('edit');
    setDrawerOpen(true);
  };

  const handleView = (notif: WtnWorkflowTemplateNotification) => {
    setEditingNotif(notif);
    setSheetMode('view');
    setDrawerOpen(true);
  };

  const handleDelete = async (wtnId: string) => {
    try {
      await apiDelete(`/api/workflow/templates/${wflId}/tasks/${task.wtkId}/notifications/${wtnId}`);
      toast({ title: 'Success', description: 'Notification deleted.' });
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete notification';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const onSubmit = async (data: NotificationFormData) => {
    const payload = {
      eventType: data.eventType,
      recipientType: data.recipientType,
      recipientUserId: data.recipientType === 'USER' && data.recipientUserId.trim()
        ? parseInt(data.recipientUserId, 10)
        : null,
      recipientRoleId: data.recipientType === 'ROLE' ? (data.recipientRoleId.trim() || null) : null,
      recipientDynamicType: data.recipientType === 'DYNAMIC' ? (data.recipientDynamicType || null) : null,
      messageTemplate: data.messageTemplate.trim(),
      emailTemplate: data.emailTemplate.trim() || null,
      slackTemplate: data.slackTemplate.trim() || null,
      isActive: data.isActive,
    };

    try {
      if (editingNotif) {
        await apiPatch<unknown, typeof payload>(
          `/api/workflow/templates/${wflId}/tasks/${task.wtkId}/notifications/${editingNotif.wtnId}`,
          payload,
        );
        toast({ title: 'Success', description: 'Notification updated.' });
      } else {
        await apiPost<unknown, typeof payload>(
          `/api/workflow/templates/${wflId}/tasks/${task.wtkId}/notifications`,
          payload,
        );
        toast({ title: 'Success', description: 'Notification created.' });
      }
      setDrawerOpen(false);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save notification';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const columns = useMemo<ColumnDef<WtnWorkflowTemplateNotification>[]>(
    () => [
      {
        accessorKey: 'eventType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Event Type" />,
        cell: ({ row }) => <Badge variant="outline" size="sm">{row.original.eventType}</Badge>,
        size: 180,
        meta: { headerTitle: 'Event Type', skeleton: <Skeleton className="h-5 w-32" /> },
      },
      {
        accessorKey: 'recipientType',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Recipient Type" />,
        cell: ({ row }) => row.original.recipientType,
        size: 120,
        meta: { headerTitle: 'Recipient Type', skeleton: <Skeleton className="h-4 w-16" /> },
      },
      {
        accessorKey: 'isActive',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Active" />,
        cell: ({ row }) => (row.original.isActive ? 'Yes' : 'No'),
        size: 80,
        meta: { headerTitle: 'Active', skeleton: <Skeleton className="h-4 w-8" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleView(row.original)}>
              <Eye size={14} />
            </Button>
            {canEdit && (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.wtnId)}>
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </>
            )}
          </div>
        ),
        size: 110,
        enableSorting: false,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right',
          skeleton: <Skeleton className="h-8 w-16 ml-auto" />,
        },
      },
    ],
    [canEdit],
  );

  const table = useReactTable({
    data: notifications,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div>
      {canEdit && (
        <div className="flex justify-end mb-2">
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <Plus size={14} className="me-1" />
            Add Notification
          </Button>
        </div>
      )}

      <DataGridContainer>
        <DataGrid
          table={table}
          recordCount={notifications.length}
          isLoading={false}
          emptyMessage="No notifications configured."
        >
          <DataGridTable />
          <DataGridPagination sizes={[5, 10]} />
        </DataGrid>
      </DataGridContainer>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {sheetMode === 'view'
                ? 'Notification Details'
                : editingNotif
                  ? 'Edit Notification'
                  : 'Add Notification'}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>
                Event Type <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={EVENT_TYPE_OPTIONS}
                value={watch('eventType')}
                onValueChange={(v) => setValue('eventType', v)}
                placeholder="Select event..."
                disabled={sheetMode === 'view'}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Recipient Type <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={RECIPIENT_TYPE_OPTIONS}
                value={watchedRecipientType}
                onValueChange={(v) => setValue('recipientType', v)}
                placeholder="Select recipient type..."
                disabled={sheetMode === 'view'}
              />
            </div>

            {watchedRecipientType === 'USER' && (
              <div className="space-y-1.5">
                <Label>Recipient User</Label>
                <ComboBox
                  options={userOptions}
                  value={watch('recipientUserId')}
                  onValueChange={(v) => setValue('recipientUserId', v)}
                  placeholder="Select user..."
                  searchPlaceholder="Search users..."
                  emptyMessage="No users found."
                  disabled={sheetMode === 'view'}
                />
              </div>
            )}

            {watchedRecipientType === 'ROLE' && (
              <div className="space-y-1.5">
                <Label htmlFor="notif-role">Recipient Role ID</Label>
                <Input id="notif-role" disabled={sheetMode === 'view'} {...register('recipientRoleId')} />
              </div>
            )}

            {watchedRecipientType === 'DYNAMIC' && (
              <div className="space-y-1.5">
                <Label>Recipient Dynamic Type</Label>
                <ComboBox
                  options={DYNAMIC_RECIPIENT_OPTIONS}
                  value={watch('recipientDynamicType')}
                  onValueChange={(v) => setValue('recipientDynamicType', v)}
                  placeholder="Select..."
                  disabled={sheetMode === 'view'}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notif-msg">
                Message Template <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="notif-msg"
                disabled={sheetMode === 'view'}
                {...register('messageTemplate', { required: 'Message template is required' })}
                rows={3}
                placeholder="Use {{taskName}}, {{assigneeName}}, etc."
              />
              {errors.messageTemplate && (
                <p className="text-sm text-destructive">{errors.messageTemplate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notif-email">Email Template</Label>
              <Textarea id="notif-email" disabled={sheetMode === 'view'} {...register('emailTemplate')} rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notif-slack">Slack Template</Label>
              <Textarea id="notif-slack" disabled={sheetMode === 'view'} {...register('slackTemplate')} rows={3} />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="notif-active"
                checked={watch('isActive')}
                onCheckedChange={(v) => setValue('isActive', v)}
                disabled={sheetMode === 'view'}
              />
              <Label htmlFor="notif-active">Active</Label>
            </div>

            <SheetFooter className="pt-4">
              {sheetMode === 'view' ? (
                <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
                  Close
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editingNotif ? 'Update' : 'Create'}
                  </Button>
                </>
              )}
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
