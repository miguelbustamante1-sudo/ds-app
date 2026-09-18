import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import type { WatchedEntityDto, WatchedFieldDto } from '@shared/dto';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiGet, apiPatch } from '@/lib/api';
import { WatchedEntityFormDialog } from './entity-form';
import { WatchedFieldFormDialog } from './field-form';

function formatTimestamp(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export function WatchedFieldsPage() {
  const { toast } = useToast();
  const { canRead, canCreate } = usePermissions();

  const [entities, setEntities] = useState<WatchedEntityDto[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(true);
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);

  const [fields, setFields] = useState<WatchedFieldDto[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  const [entityFormOpen, setEntityFormOpen] = useState(false);
  const [fieldFormOpen, setFieldFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<WatchedFieldDto | undefined>();

  const showError = useCallback(
    (err: unknown, fallback: string) => {
      const message = err instanceof Error ? err.message : fallback;
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
    [toast],
  );

  const loadEntities = useCallback(async () => {
    setEntitiesLoading(true);
    try {
      const data = await apiGet<WatchedEntityDto[]>('/api/watched-fields/entities');
      setEntities(data);
      setSelectedEntityType((current) => current ?? data[0]?.entityType ?? null);
    } catch (err) {
      showError(err, 'Failed to load watched entities');
    } finally {
      setEntitiesLoading(false);
    }
  }, [showError]);

  const loadFields = useCallback(
    async (entityType: string) => {
      setFieldsLoading(true);
      try {
        setFields(await apiGet<WatchedFieldDto[]>(`/api/watched-fields/entities/${entityType}/fields`));
      } catch (err) {
        showError(err, 'Failed to load watched fields');
      } finally {
        setFieldsLoading(false);
      }
    },
    [showError],
  );

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  useEffect(() => {
    if (selectedEntityType) loadFields(selectedEntityType);
  }, [selectedEntityType, loadFields]);

  const selectedEntity = entities.find((e) => e.entityType === selectedEntityType);

  const handleToggleEntity = async (entity: WatchedEntityDto, active: boolean) => {
    try {
      await apiPatch<WatchedEntityDto, { active: boolean }>(
        `/api/watched-fields/entities/${entity.entityType}/active`,
        { active },
      );
      toast({
        title: 'Success',
        description: `${entity.label} ${active ? 'activated' : 'deactivated'}`,
      });
      loadEntities();
    } catch (err) {
      showError(err, 'Failed to update entity');
    }
  };

  const handleAddField = () => {
    setEditingField(undefined);
    setFieldFormOpen(true);
  };

  const handleEditField = (field: WatchedFieldDto) => {
    setEditingField(field);
    setFieldFormOpen(true);
  };

  const handleFieldSaved = () => {
    setFieldFormOpen(false);
    setEditingField(undefined);
    if (selectedEntityType) loadFields(selectedEntityType);
    loadEntities();
  };

  if (!canRead('WatchedFields')) {
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
          <ToolbarPageTitle>Object &amp; Field Manager</ToolbarPageTitle>
          <ToolbarDescription>
            Configure which entities and fields the change detection engine watches.
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {canCreate('WatchedFields') && (
            <Button onClick={() => setEntityFormOpen(true)}>
              <Plus size={16} className="me-1" />
              New Entity
            </Button>
          )}
        </ToolbarActions>
      </Toolbar>

      <div className="mt-6 bg-card rounded-lg border">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Watched Entities</h2>
          <p className="text-xs text-muted-foreground">
            Entity types are permanent once created and cannot be renamed or deleted — deactivate
            instead. Select a row to manage its fields.
          </p>
        </div>
        {entitiesLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity Type</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Active Fields</TableHead>
                <TableHead>Seeded</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No watched entities yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                entities.map((entity) => (
                  <TableRow
                    key={entity.entityType}
                    onClick={() => setSelectedEntityType(entity.entityType)}
                    className={`cursor-pointer ${
                      entity.entityType === selectedEntityType ? 'bg-muted/60' : ''
                    }`}
                  >
                    <TableCell className="font-mono text-xs">{entity.entityType}</TableCell>
                    <TableCell className="font-medium">{entity.label}</TableCell>
                    <TableCell className="text-muted-foreground">{entity.ownerEmail ?? '—'}</TableCell>
                    <TableCell className="text-right">{entity.activeFieldCount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTimestamp(entity.seededAt)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={entity.active}
                        disabled={!canCreate('WatchedFields')}
                        onCheckedChange={(checked) => handleToggleEntity(entity, checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="mt-6 bg-card rounded-lg border">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">
              Watched Fields{selectedEntity ? ` — ${selectedEntity.label}` : ''}
            </h2>
            <p className="text-xs text-muted-foreground">
              Field paths must match the JSON keys in the entity snapshot payload.
            </p>
          </div>
          {canCreate('WatchedFields') && selectedEntityType && (
            <Button variant="outline" size="sm" onClick={handleAddField}>
              <Plus size={16} className="me-1" />
              Add Field
            </Button>
          )}
        </div>

        {!selectedEntityType ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Select an entity above to manage its fields.
          </div>
        ) : fieldsLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field Path</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Data Type</TableHead>
                <TableHead>Significance</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No fields configured for this entity yet.
                  </TableCell>
                </TableRow>
              ) : (
                fields.map((field) => (
                  <TableRow key={field.fieldId}>
                    <TableCell className="font-mono text-xs">{field.fieldPath}</TableCell>
                    <TableCell className="font-medium">{field.displayName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" appearance="outline">
                        {field.dataType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={field.significance === 'material' ? 'primary' : 'secondary'}
                        appearance="light"
                      >
                        {field.significance}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {field.updatedAt ? (
                        <>
                          {formatTimestamp(field.updatedAt)}
                          <span className="block">{field.updatedBy ?? '—'}</span>
                        </>
                      ) : (
                        <>
                          {formatTimestamp(field.createdAt)}
                          <span className="block">{field.createdBy ?? '—'}</span>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={field.active ? 'success' : 'secondary'} appearance="light">
                        {field.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canCreate('WatchedFields') && (
                        <Button variant="ghost" size="sm" onClick={() => handleEditField(field)}>
                          <Pencil size={16} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <WatchedEntityFormDialog
        open={entityFormOpen}
        onOpenChange={setEntityFormOpen}
        onSuccess={(created) => {
          setEntityFormOpen(false);
          setSelectedEntityType(created.entityType);
          loadEntities();
        }}
      />

      {selectedEntityType && (
        <WatchedFieldFormDialog
          open={fieldFormOpen}
          onOpenChange={setFieldFormOpen}
          entityType={selectedEntityType}
          field={editingField}
          onSuccess={handleFieldSaved}
        />
      )}
    </div>
  );
}
