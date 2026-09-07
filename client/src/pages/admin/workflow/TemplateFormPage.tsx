import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
  ToolbarActions,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { TaskPanel } from './components/TaskPanel';
import { RoutePanel } from './components/RoutePanel';
import { DependencyPanel } from './components/DependencyPanel';
import type { WflWorkflowTemplate } from './types';

interface TemplateFormData {
  code: string;
  name: string;
  description: string;
  versionNo: string;
  effectiveFrom: string;
  effectiveTo: string;
}

export function TemplateFormPage() {
  const navigate = useNavigate();
  const { wflId } = useParams<{ wflId?: string }>();
  const isEditing = !!wflId;

  const { canCreate } = usePermissions();
  const { toast } = useToast();

  const [template, setTemplate] = useState<WflWorkflowTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormData>({
    defaultValues: {
      code: '',
      name: '',
      description: '',
      versionNo: '1',
      effectiveFrom: '',
      effectiveTo: '',
    },
  });

  const loadTemplate = async () => {
    if (!wflId) return;
    setLoading(true);
    try {
      const data = await apiGet<WflWorkflowTemplate>(`/api/workflow/templates/${wflId}`);
      setTemplate(data);
      reset({
        code: data.code,
        name: data.name,
        description: data.description ?? '',
        versionNo: data.versionNo.toString(),
        effectiveFrom: data.effectiveFrom
          ? String(data.effectiveFrom).split('T')[0]
          : '',
        effectiveTo: data.effectiveTo
          ? String(data.effectiveTo).split('T')[0]
          : '',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load template';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEditing) {
      loadTemplate();
    }
  }, [wflId]);

  const onSave = async (data: TemplateFormData) => {
    const payload = {
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description.trim() || null,
      versionNo: parseInt(data.versionNo, 10) || 1,
      effectiveFrom: data.effectiveFrom || null,
      effectiveTo: data.effectiveTo || null,
    };

    try {
      if (isEditing) {
        const updated = await apiPatch<WflWorkflowTemplate, typeof payload>(
          `/api/workflow/templates/${wflId}`,
          payload,
        );
        setTemplate(updated);
        toast({ title: 'Success', description: 'Template saved.' });
      } else {
        const created = await apiPost<WflWorkflowTemplate, typeof payload>(
          '/api/workflow/templates',
          payload,
        );
        toast({ title: 'Success', description: 'Template created.' });
        navigate(`/admin/workflow/templates/${created.wflId}/edit`, { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save template';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handlePublish = async () => {
    if (!wflId) return;
    try {
      await apiPost<unknown, Record<string, never>>(`/api/workflow/templates/${wflId}/publish`, {});
      toast({ title: 'Success', description: 'Template published.' });
      await loadTemplate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish template';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  if (!canCreate('WorkflowAdmin')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  const isDraft = !template || template.status === 'DRAFT';
  const isPublished = template?.status !== 'DRAFT' && template !== null;
  const hasTasks = (template?.tasks?.length ?? 0) > 0;
  // Tasks/inputs/outcomes/notifications/dependencies are copied into instance-scoped
  // tables at instantiation, so editing them on a PUBLISHED template can't affect an
  // in-flight instance — only routes stay locked to DRAFT (RoutingEngine reads them
  // live). ARCHIVED templates are never editable.
  const canEdit = isDraft || template?.status === 'PUBLISHED';

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>
            {isEditing ? 'Edit Workflow Template' : 'New Workflow Template'}
          </ToolbarPageTitle>
          <ToolbarDescription>
            {isEditing ? `Editing template ${template?.code ?? ''}` : 'Create a new workflow template'}
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={() => navigate('/admin/workflow/templates')}>
            Back to List
          </Button>
        </ToolbarActions>
      </Toolbar>

      {loading ? (
        <div className="space-y-4 mt-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          {isPublished && (
            <div className="rounded-md border border-warning bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
              Template is {template?.status?.toLowerCase()}. Create a new version to make changes.
            </div>
          )}

          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <CardTitle>Template Details</CardTitle>
                <div className="flex gap-2">
                  {isDraft && (
                    <Button
                      onClick={handleSubmit(onSave)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Save as Draft'}
                    </Button>
                  )}
                  {isEditing && isDraft && hasTasks && (
                    <Button variant="secondary" onClick={handlePublish}>
                      Publish
                    </Button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit(onSave)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="tpl-code">
                      Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="tpl-code"
                      {...register('code', { required: 'Code is required' })}
                      placeholder="e.g. ONBOARDING_V1"
                      readOnly={isPublished}
                    />
                    {errors.code && (
                      <p className="text-sm text-destructive">{errors.code.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tpl-version">
                      Version <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="tpl-version"
                      type="number"
                      {...register('versionNo', { required: 'Version is required' })}
                      readOnly={isPublished}
                    />
                    {errors.versionNo && (
                      <p className="text-sm text-destructive">{errors.versionNo.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tpl-name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tpl-name"
                    {...register('name', { required: 'Name is required' })}
                    placeholder="Template name"
                    readOnly={isPublished}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tpl-desc">Description</Label>
                  <Textarea
                    id="tpl-desc"
                    {...register('description')}
                    rows={2}
                    readOnly={isPublished}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="tpl-from">Effective From</Label>
                    <Input
                      id="tpl-from"
                      type="date"
                      {...register('effectiveFrom')}
                      readOnly={isPublished}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tpl-to">Effective To</Label>
                    <Input
                      id="tpl-to"
                      type="date"
                      {...register('effectiveTo')}
                      readOnly={isPublished}
                    />
                  </div>
                </div>

                {/* wecId: TODO — entity config endpoint not yet available */}
              </form>
            </CardContent>
          </Card>

          {isEditing && template && (
            <Card>
              <CardContent>
                <CardTitle className="mb-4">Template Structure</CardTitle>
                <Tabs defaultValue="tasks">
                  <TabsList variant="line">
                    <TabsTrigger value="tasks">
                      Tasks
                      {(template.tasks?.length ?? 0) > 0 && (
                        <span className="ms-1.5 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">
                          {template.tasks?.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="routes">
                      Routes
                      {(template.routes?.length ?? 0) > 0 && (
                        <span className="ms-1.5 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">
                          {template.routes?.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="dependencies">
                      Dependencies
                      {(template.dependencies?.length ?? 0) > 0 && (
                        <span className="ms-1.5 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">
                          {template.dependencies?.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="tasks" className="mt-4">
                    <TaskPanel
                      wflId={template.wflId}
                      tasks={template.tasks ?? []}
                      onRefresh={loadTemplate}
                      isDraft={isDraft}
                      canEdit={canEdit}
                    />
                  </TabsContent>

                  <TabsContent value="routes" className="mt-4">
                    <RoutePanel
                      wflId={template.wflId}
                      routes={template.routes ?? []}
                      tasks={template.tasks ?? []}
                      onRefresh={loadTemplate}
                      isDraft={isDraft}
                    />
                  </TabsContent>

                  <TabsContent value="dependencies" className="mt-4">
                    <DependencyPanel
                      wflId={template.wflId}
                      dependencies={template.dependencies ?? []}
                      tasks={template.tasks ?? []}
                      onRefresh={loadTemplate}
                      canEdit={canEdit}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
