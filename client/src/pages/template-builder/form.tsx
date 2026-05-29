import { useEffect, useRef, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import type { PersistenceTemplateDTO } from '@shared/dto/PersistenceTemplate';
import { ErrorHandlingStrategy, DuplicatesHandlingStrategy } from '@shared/dto/PersistenceTemplate';
import type { PersistenceTable, PersistenceTableColumn } from '@shared/dto/PersistenceTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  createPersistenceTemplate,
  updatePersistenceTemplate,
  getAllPersistenceTables,
} from '@/services/persistenceTemplate';
import { ERROR_HANDLING_DESCRIPTIONS, DUPLICATE_HANDLING_DESCRIPTIONS } from '@/config/persistenceStrategyDescriptions';

// --- Helpers ------------------------------------------------------------------

/** Format the Length column: varchar -> plain length; numeric -> "precision, scale". */
function formatLength(col: PersistenceTableColumn): string {
  if (col.numericPrecision != null) {
    const scale = col.numericScale != null ? `,${col.numericScale}` : '';
    return `${col.numericPrecision}${scale}`;
  }
  return col.length != null ? String(col.length) : '-';
}

/** Render the Default column safely. */
function formatDefault(value: unknown): string {
  if (value == null) return '-';
  return String(value);
}

// --- Types -------------------------------------------------------------------

/** Extends the table-metadata column with the CSV mapping fields. */
interface ColumnRow extends PersistenceTableColumn {
  csvColumnName: string | null;
  csvColumnIndex: number;
}

interface PersistenceTemplateFormData {
  name: string;
  description: string;
  hasCsvHeader: boolean;
  separator: string;
  truncateBeforeImport: boolean;
  errorHandlingStrategy: ErrorHandlingStrategy;
  duplicatesHandlingStrategy: DuplicatesHandlingStrategy;
  targetTable: string;
}

const SEPARATOR_OPTIONS = [
  { value: ',',  label: 'Comma (,)' },
  { value: '\t', label: 'Tab' },
  { value: ';',  label: 'Semicolon (;)' },
  { value: '|',  label: 'Pipe (|)' },
];

interface PersistenceTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: PersistenceTemplateDTO;
  onSuccess: () => void;
}

// --- Component ---------------------------------------------------------------

export function PersistenceTemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
}: PersistenceTemplateFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!template;

  const [tables, setTables] = useState<PersistenceTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [columns, setColumns] = useState<ColumnRow[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTable, setPendingTable] = useState<string | null>(null);
  // When editing, columns are seeded from the saved record. This ref stays true
  // until the user explicitly picks a different table, preventing the async
  // tables-load from wiping the restored columns on every re-run of the effect.
  const columnsFromTemplate = useRef(false);
  const [initialCsvHeader, setInitialCsvHeader] = useState<boolean | null>(null);
  // Guards the hasCsvHeader effect so it skips the fire caused by reset() on open.
  const csvHeaderReady = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PersistenceTemplateFormData>({
    defaultValues: {
      name: '',
      description: '',
      hasCsvHeader: false,
      separator: ',',
      truncateBeforeImport: false,
      errorHandlingStrategy: ErrorHandlingStrategy.STOP_ON_FIRST_ERROR_AND_COMMIT,
      duplicatesHandlingStrategy: DuplicatesHandlingStrategy.INSERT,
      targetTable: '',
    },
  });

  // Watch targetTable to update the columns preview
  const selectedTable = useWatch({ control, name: 'targetTable' });
  const errorHandlingValue = useWatch({ control, name: 'errorHandlingStrategy' });
  const duplicatesHandlingValue = useWatch({ control, name: 'duplicatesHandlingStrategy' });
  const hasCsvHeaderValue = useWatch({ control, name: 'hasCsvHeader' });

  // Load all tables once when dialog opens
  useEffect(() => {
    if (!open) return;

    setTablesLoading(true);
    getAllPersistenceTables()
      .then(setTables)
      .catch(() => {
        toast({
          title: 'Warning',
          description: 'Could not load target tables.',
          variant: 'destructive',
        });
      })
      .finally(() => setTablesLoading(false));
  }, [open, toast]);

  /** Called when the Select fires a new value. */
  const handleTableChange = (newValue: string, fieldOnChange: (v: string) => void) => {
    columnsFromTemplate.current = false;
    if (columns.length > 0) {
      // Columns already loaded - ask for confirmation first
      setPendingTable(newValue);
      setConfirmOpen(true);
    } else {
      // No columns yet - apply immediately
      fieldOnChange(newValue);
    }
  };

  /** User clicked "Accept" in the confirmation dialog. */
  const handleConfirmAccept = (fieldOnChange: (v: string) => void) => {
    if (pendingTable !== null) {
      fieldOnChange(pendingTable);
    }
    setPendingTable(null);
    setConfirmOpen(false);
  };

  /** User clicked "Cancel" in the confirmation dialog. */
  const handleConfirmCancel = () => {
    setPendingTable(null);
    setConfirmOpen(false);
  };

  // Update columns preview whenever the selected table changes.
  // Skip the first sync when columns were loaded from a saved template record
  // (tables may not be loaded yet, which would wipe the saved columns).
  useEffect(() => {
    if (columnsFromTemplate.current) {
      // Columns were seeded from the template - skip until the user picks a new table.
      return;
    }
    if (!selectedTable) {
      setColumns([]);
      return;
    }
    const [schema, name] = selectedTable.split('.');
    const found = tables.find((t) => t.schema === schema && t.name === name);
    setColumns(
      (found?.columns ?? []).map((c) => ({ ...c, csvColumnName: null, csvColumnIndex: -1 })),
    );
  }, [selectedTable, tables]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form when dialog opens or editing record changes
  useEffect(() => {
    if (open) {
      // Reset guard so hasCsvHeader effect skips the fire from reset() below.
      csvHeaderReady.current = false;
      if (template) {
        const savedCsvHeader = template.hasCsvHeader ?? false;
        setInitialCsvHeader(savedCsvHeader);
        reset({
          name: template.name,
          description: template.description ?? '',
          hasCsvHeader: savedCsvHeader,
          separator: template.separator ?? ',',
          truncateBeforeImport: template.truncateBeforeImport ?? false,
          errorHandlingStrategy:
            template.errorHandlingStrategy ?? ErrorHandlingStrategy.STOP_ON_FIRST_ERROR_AND_COMMIT,
          duplicatesHandlingStrategy:
            template.duplicatesHandlingStrategy ?? DuplicatesHandlingStrategy.INSERT,
          targetTable: template.targetTable ?? '',
        });
        // Populate columns from the saved template record and raise the guard
        // so the selectedTable watcher never overwrites them until the user
        // explicitly picks a new table.
        columnsFromTemplate.current = true;
        setColumns(
          template.columns.map((c) => ({
            index: c.index,
            name: c.name,
            type: c.type ?? '',
            length: c.length ?? null,
            allowNull: c.allowNull,
            numericPrecision: null,
            numericScale: null,
            default: null,
            csvColumnName: c.csvColumnName ?? null,
            csvColumnIndex: c.csvColumnIndex ?? -1,
          })),
        );
      } else {
        columnsFromTemplate.current = false;
        setInitialCsvHeader(null);
        reset({
          name: '',
          description: '',
          hasCsvHeader: false,
          errorHandlingStrategy: ErrorHandlingStrategy.STOP_ON_FIRST_ERROR_AND_COMMIT,
          duplicatesHandlingStrategy: DuplicatesHandlingStrategy.INSERT,
          targetTable: '',
        });
        setColumns([]);
      }
    }
  }, [open, template, reset]);

  // When hasCsvHeader changes (after initialization), reset CSV mapping fields.
  // csvHeaderReady guards against the first fire triggered by reset() on open.
  useEffect(() => {
    if (!csvHeaderReady.current) {
      csvHeaderReady.current = true;
      return;
    }
    setColumns((prev) =>
      prev.map((c) => ({ ...c, csvColumnName: null, csvColumnIndex: -1 })),
    );
  }, [hasCsvHeaderValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: PersistenceTemplateFormData) => {
    // Map current columns state -> API input shape.
    // Re-index from 0 based on display order so the CSV validator can use
    // the index as a positional column offset regardless of the original
    // DB or table-metadata index value.
    const columnPayload = columns.map((col, position) => ({
      index: position,
      name: col.name,
      type: col.type ?? null,
      length: col.length ?? null,
      allowNull: col.allowNull,
      csvColumnName: data.hasCsvHeader ? (col.csvColumnName ?? null) : null,
      csvColumnIndex: data.hasCsvHeader ? -1 : (col.csvColumnIndex ?? -1),
    }));

    try {
      if (isEditing) {
        await updatePersistenceTemplate(template.id, {
          name: data.name.trim(),
          description: data.description.trim() || null,
          hasCsvHeader: data.hasCsvHeader,
          separator: data.separator || ',',
          truncateBeforeImport: data.truncateBeforeImport,
          errorHandlingStrategy: data.errorHandlingStrategy,
          duplicatesHandlingStrategy: data.duplicatesHandlingStrategy,
          targetTable: data.targetTable || null,
          updatedBy: 'ui',
          columns: columnPayload,
        });
        toast({ title: 'Success', description: 'Persistence template updated successfully' });
      } else {
        await createPersistenceTemplate({
          name: data.name.trim(),
          description: data.description.trim() || null,
          hasCsvHeader: data.hasCsvHeader,
          separator: data.separator || ',',
          truncateBeforeImport: data.truncateBeforeImport,
          errorHandlingStrategy: data.errorHandlingStrategy,
          duplicatesHandlingStrategy: data.duplicatesHandlingStrategy,
          targetTable: data.targetTable || null,
          createdBy: 'ui',
          columns: columnPayload,
        });
        toast({ title: 'Success', description: 'Persistence template created successfully' });
      }
      onSuccess();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to ${isEditing ? 'update' : 'create'} persistence template`;
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Persistence Template' : 'New Persistence Template'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the persistence template information below.'
              : 'Fill in the details to create a new persistence template.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Employee Import"
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                {...register('description')}
              />
            </div>

            {/* Includes CSV Header */}
            <div className="space-y-2">
              <Label>Includes CSV Header</Label>
              <Controller
                name="hasCsvHeader"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value ? 'yes' : 'no'}
                    onValueChange={(v) => field.onChange(v === 'yes')}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="yes" id="csvHeaderYes" />
                      <Label htmlFor="csvHeaderYes" className="font-normal cursor-pointer">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="no" id="csvHeaderNo" />
                      <Label htmlFor="csvHeaderNo" className="font-normal cursor-pointer">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              />
              <p className="text-xs text-muted-foreground">
                {hasCsvHeaderValue
                  ? 'When including CSV header, columns will be matched by Column Name.'
                  : 'When CSV has no header, columns will be matched by Column Index.'}
              </p>
              {initialCsvHeader !== null && hasCsvHeaderValue !== initialCsvHeader && (
                <div className="flex items-start gap-2 rounded-md border border-uds-system-amber-400 bg-uds-system-amber-100 p-3 text-uds-system-amber-700">
                  <AlertTriangle className="mt-0.5 shrink-0" size={15} />
                  <p className="text-xs">
                    CSV column references in the Columns section should be reviewed and updated to
                    match the new header setting before saving.
                  </p>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="space-y-2">
              <Label htmlFor="separator">Separator</Label>
              <Controller
                name="separator"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="separator" className="w-48">
                      <SelectValue placeholder="Select separator" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEPARATOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Truncate Before Import */}
            <div className="space-y-2">
              <Label>Truncate Before Import</Label>
              <Controller
                name="truncateBeforeImport"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value ? 'yes' : 'no'}
                    onValueChange={(v) => field.onChange(v === 'yes')}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="yes" id="truncateYes" />
                      <Label htmlFor="truncateYes" className="font-normal cursor-pointer">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="no" id="truncateNo" />
                      <Label htmlFor="truncateNo" className="font-normal cursor-pointer">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              />
              <p className="text-xs text-muted-foreground">
                When enabled, the target table will be truncated before each import. This action cannot be undone even if the import fails.
              </p>
            </div>

            {/* Error Handling */}
            <div className="space-y-2">
              <Label>Error Handling</Label>
              <Controller
                name="errorHandlingStrategy"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        value={ErrorHandlingStrategy.STOP_ON_FIRST_ERROR_AND_COMMIT}
                        id="errorCommit"
                      />
                      <Label htmlFor="errorCommit" className="font-normal cursor-pointer">
                        Commit
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        value={ErrorHandlingStrategy.STOP_ON_FIRST_ERROR_AND_ROLLBACK}
                        id="errorRevert"
                      />
                      <Label htmlFor="errorRevert" className="font-normal cursor-pointer">
                        Revert
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {errorHandlingValue && (
                <p className="text-xs text-muted-foreground">
                  {ERROR_HANDLING_DESCRIPTIONS[errorHandlingValue]}
                </p>
              )}
            </div>

            {/* Duplicate Handling */}
            <div className="space-y-2">
              <Label>Duplicate Handling</Label>
              <Controller
                name="duplicatesHandlingStrategy"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        value={DuplicatesHandlingStrategy.INSERT}
                        id="dupInsert"
                      />
                      <Label htmlFor="dupInsert" className="font-normal cursor-pointer">
                        Insert
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        value={DuplicatesHandlingStrategy.REPLACE}
                        id="dupReplace"
                      />
                      <Label htmlFor="dupReplace" className="font-normal cursor-pointer">
                        Replace
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {duplicatesHandlingValue && (
                <p className="text-xs text-muted-foreground">
                  {DUPLICATE_HANDLING_DESCRIPTIONS[duplicatesHandlingValue]}
                </p>
              )}
            </div>

            {/* Target Table - Select dropdown */}
            <div className="space-y-2">
              <Label htmlFor="targetTable">Target Table</Label>
              <Controller
                name="targetTable"
                control={control}
                render={({ field }) => (
                  <>
                    <Select
                      value={field.value}
                      onValueChange={(v) => handleTableChange(v, field.onChange)}
                      disabled={tablesLoading}
                    >
                      <SelectTrigger id="targetTable">
                        <SelectValue
                          placeholder={tablesLoading ? 'Loading tables…' : 'Select a table'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.map((t) => {
                          const value = `${t.schema}.${t.name}`;
                          return (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {/* Confirmation dialog - reload columns? */}
                    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Reload Columns?</DialogTitle>
                          <DialogDescription>
                            Changing the target table will reload the columns list. Any manual
                            changes will be lost. Do you want to continue?
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={handleConfirmCancel}>
                            Cancel
                          </Button>
                          <Button onClick={() => handleConfirmAccept(field.onChange)}>
                            Accept
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              />
            </div>

            {/* Columns preview table */}
            {columns.length > 0 && (
              <div className="space-y-2">
                <Label>Columns</Label>
                {!hasCsvHeaderValue && (
                  <p className="text-xs text-uds-system-blue-600">
                    Data mapping begins at Index 0, while Index -1 identifies columns that remain unassigned to CSV fields.
                  </p>
                )}
                <div className="rounded-md border overflow-auto max-h-56">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead className="w-32 max-w-[8rem]">Name</TableHead>
                        <TableHead>Datatype</TableHead>
                        <TableHead>Length</TableHead>
                        <TableHead>Allow Null</TableHead>
                        <TableHead className="w-20 max-w-[5rem]">Default</TableHead>
                        <TableHead className="w-36">
                          {hasCsvHeaderValue ? 'CSV Column Name' : 'CSV Column Index'}
                        </TableHead>
                        <TableHead className="w-8 p-0" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {columns.map((col, colPos) => (
                        <TableRow key={col.index}>
                          <TableCell className="text-muted-foreground">{colPos}</TableCell>
                          <TableCell className="font-medium w-32 max-w-[8rem] break-words whitespace-normal">{col.name}</TableCell>
                          <TableCell>{col.type}</TableCell>
                          <TableCell>{formatLength(col)}</TableCell>
                          <TableCell>{col.allowNull ? 'Yes' : 'No'}</TableCell>
                          <TableCell className="text-muted-foreground w-20 max-w-[5rem] break-words whitespace-normal">
                            {formatDefault(col.default)}
                          </TableCell>
                          <TableCell className="w-36">
                            {hasCsvHeaderValue ? (
                              <Input
                                type="text"
                                className="h-7 text-xs px-2"
                                placeholder="Column name"
                                value={col.csvColumnName ?? ''}
                                onChange={(e) =>
                                  setColumns((prev) =>
                                    prev.map((c) =>
                                      c.index === col.index
                                        ? { ...c, csvColumnName: e.target.value || null }
                                        : c,
                                    ),
                                  )
                                }
                              />
                            ) : (
                              <Input
                                type="number"
                                className="h-7 text-xs px-2"
                                placeholder="-1"
                                value={col.csvColumnIndex}
                                onChange={(e) => {
                                  const parsed = parseInt(e.target.value, 10);
                                  setColumns((prev) =>
                                    prev.map((c) =>
                                      c.index === col.index
                                        ? { ...c, csvColumnIndex: isNaN(parsed) ? -1 : parsed }
                                        : c,
                                    ),
                                  );
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell className="w-8 p-0 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive h-7 w-7 p-0"
                              onClick={() =>
                                setColumns((prev) => prev.filter((c) => c.index !== col.index))
                              }
                            >
                              <Trash2 size={15} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
