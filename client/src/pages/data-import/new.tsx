import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getPersistenceTemplates } from '@/services/persistenceTemplate';
import { ERROR_HANDLING_DESCRIPTIONS, DUPLICATE_HANDLING_DESCRIPTIONS } from '@/config/persistenceStrategyDescriptions';
import { createPersistenceJob } from '@/services/persistenceJob';
import type { PersistenceTemplateDTO } from '@shared/dto/PersistenceTemplate';

// --- CSV preview helpers ------------------------------------------------------

const CSV_PREVIEW_ROWS = 25;

/** Splits a single CSV line respecting double-quoted fields. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Escaped quote inside a quoted field
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

interface CsvPreview {
  headers: string[];
  rows: string[][];
}

function parseCsvPreview(text: string): CsvPreview {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0] ?? '');
  const dataLines = lines.slice(1).slice(0, CSV_PREVIEW_ROWS);
  const rows = dataLines.map(parseCsvLine);
  return { headers, rows };
}

// --- Data type / validation types --------------------------------------------

interface DataTypeRecord {
  id: number;
  name: string;
  regularExpression: string | null;
  example: string | null;
}

/** A cell position that failed format validation. */
interface CellError {
  row: number; // 0-based index into previewRows
  col: number; // 0-based column index
  message: string;
}

/**
 * Validates the CSV preview rows against the selected template columns.
 * Each template column has a `type` name; if a DataTypeRecord with that name
 * has a regularExpression, every cell in that column is tested against it.
 * Returns a list of CellError for all failing cells in the 25-row preview.
 */
function validateCsvPreview(
  preview: CsvPreview,
  template: PersistenceTemplateDTO,
  dataTypes: DataTypeRecord[],
): CellError[] {
  const errors: CellError[] = [];
  const dtMap = new Map<string, DataTypeRecord>(
    dataTypes.map((dt) => [dt.name.toLowerCase(), dt]),
  );

  for (const col of template.columns) {
    if (!col.type) continue;
    const dt = dtMap.get(col.type.toLowerCase());
    if (!dt || !dt.regularExpression) continue;

    let regex: RegExp;
    try {
      regex = new RegExp(`^${dt.regularExpression}$`);
    } catch {
      continue; // skip malformed regex
    }

    const colIndex = col.index; // 0-based column index in the CSV
    const rowLimit = Math.min(preview.rows.length, CSV_PREVIEW_ROWS);

    for (let ri = 0; ri < rowLimit; ri++) {
      const row = preview.rows[ri];
      const cell = row?.[colIndex] ?? '';

      // Skip empty cells — let allowNull / server validation handle them
      if (cell === '' && col.allowNull) continue;
      if (cell !== '' && !regex.test(cell)) {
        errors.push({
          row: ri,
          col: colIndex,
          message: `Row ${ri + 1}, col "${col.name}": "${cell}" does not match type "${col.type.toUpperCase()}"`,
        });
      }
    }
  }

  // Sort by row then column so navigation goes left-to-right, top-to-bottom
  errors.sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);

  return errors;
}

// --- Page component -----------------------------------------------------------

export function DataImportNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { canRead } = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template list
  const [templates, setTemplates] = useState<PersistenceTemplateDTO[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Data types (fetched once)
  const [dataTypes, setDataTypes] = useState<DataTypeRecord[]>([]);

  // Selected CSV file
  const [file, setFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);

  // Cell-level validation errors for the preview table
  const [cellErrors, setCellErrors] = useState<CellError[]>([]);
  const [errorIndex, setErrorIndex] = useState<number>(0);

  // Template picker modal
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  // Tracks selection inside the modal before confirming
  const [pickerDraftId, setPickerDraftId] = useState<string>('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // -- Load templates on mount --------------------------------------------------

  useEffect(() => {
    setTemplatesLoading(true);
    getPersistenceTemplates()
      .then((data) => {
        const enabled = data.filter((t) => t.enabled);
        setTemplates(enabled);

        // Pre-select template from query param if present and valid
        const paramId = searchParams.get('templateId');
        if (paramId && enabled.some((t) => String(t.id) === paramId)) {
          setSelectedTemplateId(paramId);
        }
      })
      .catch((err: unknown) => {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to load templates',
          variant: 'destructive',
        });
      })
      .finally(() => setTemplatesLoading(false));
  }, []);

  // -- Load data types once -----------------------------------------------------

  useEffect(() => {
    fetch('/api/persistence-data-type/?page=1&limit=100', { credentials: 'include' })
      .then((r) => r.json())
      .then((body: unknown) => {
        // API may return { data: [...], total, page, limit } or a plain array
        if (Array.isArray(body)) {
          setDataTypes(body as DataTypeRecord[]);
        } else if (body && typeof body === 'object' && 'data' in body) {
          setDataTypes((body as { data: DataTypeRecord[] }).data);
        }
      })
      .catch(() => {/* non-critical: validation simply skips if dataTypes is empty */});
  }, []);

  // -- Re-run validation whenever preview or template changes -------------------

  useEffect(() => {
    if (!csvPreview || !selectedTemplateId) {
      setCellErrors([]);
      setErrorIndex(0);
      return;
    }
    const tpl = templates.find((t) => String(t.id) === selectedTemplateId);
    if (!tpl) {
      setCellErrors([]);
      setErrorIndex(0);
      return;
    }
    const errs = validateCsvPreview(csvPreview, tpl, dataTypes);
    setCellErrors(errs);
    // Start at first error (index 0 = first row with an error)
    setErrorIndex(0);
  }, [csvPreview, selectedTemplateId, templates, dataTypes]);

  // -- File selection -----------------------------------------------------------

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    // Reset the input value so the same file can be picked again
    e.target.value = '';
    setFile(selected);

    if (!selected) {
      setCsvPreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === 'string') {
        setCsvPreview(parseCsvPreview(text));
      }
    };
    reader.readAsText(selected);
  };

  // -- Submit -------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!selectedTemplateId) {
      toast({ title: 'Validation', description: 'Please select a template.', variant: 'destructive' });
      return;
    }
    if (!file) {
      toast({ title: 'Validation', description: 'Please select a CSV file.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const job = await createPersistenceJob(parseInt(selectedTemplateId, 10), file);
      navigate(`/data-import/${job.id}`);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create import job',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // -- Permission guard ---------------------------------------------------------

  if (!canRead('PersistenceTemplates')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  const previewHeaders = csvPreview?.headers ?? [];
  const previewRows    = csvPreview?.rows ?? [];

  // Total columns = max(csv columns, template columns) so both are fully shown
  const selectedTemplate = selectedTemplateId
    ? templates.find((t) => String(t.id) === selectedTemplateId) ?? null
    : null;
  const totalCols = Math.max(
    previewHeaders.length,
    selectedTemplate ? selectedTemplate.columns.length : 0,
  );

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>New Data Import</ToolbarPageTitle>
          <ToolbarDescription>Select a template and upload a CSV file to start an import job</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button variant="outline" onClick={() => navigate('/data-import')}>
            <ArrowLeft size={16} className="me-1" />
            Back
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="mt-6 space-y-8">

        {/* -- Template selector ----------------------------------------------- */}
        <section>
          <h3 className="text-base font-semibold mb-3">1. Select Template</h3>
          <div className="rounded-lg border p-5 space-y-3">
            <Label htmlFor="template-display">Persistence Template</Label>
            <div className="flex items-center gap-2 max-w-sm">
              <Input
                id="template-display"
                readOnly
                value={
                  selectedTemplateId
                    ? (templates.find((t) => String(t.id) === selectedTemplateId)?.name ?? '')
                    : ''
                }
                placeholder={templatesLoading ? 'Loading templates...' : 'No template selected'}
                className="flex-1 bg-muted cursor-default"
              />
              <Button
                variant="outline"
                type="button"
                disabled={templatesLoading}
                onClick={() => {
                  setPickerDraftId(selectedTemplateId);
                  setTemplatePickerOpen(true);
                }}
              >
                Select
              </Button>
            </div>

            {/* Template metadata shown after selection */}
              {(() => {
                const tpl = selectedTemplateId
                  ? templates.find((t) => String(t.id) === selectedTemplateId)
                  : null;
                if (!tpl) return null;
                return (
                  <div className="grid grid-cols-3 gap-4 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Duplicate Handling</Label>
                      <p className="text-sm font-medium">
                        {tpl.duplicatesHandlingStrategy === 'REPLACE' ? 'Replace' : 'Insert'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {DUPLICATE_HANDLING_DESCRIPTIONS[tpl.duplicatesHandlingStrategy]}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Error Handling</Label>
                      <p className="text-sm font-medium">
                        {tpl.errorHandlingStrategy === 'STOP_ON_FIRST_ERROR_AND_ROLLBACK' ? 'Revert' : 'Commit'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ERROR_HANDLING_DESCRIPTIONS[tpl.errorHandlingStrategy]}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Target Table</Label>
                      <p className="text-sm font-medium">
                        {tpl.targetTable ?? <span className="text-muted-foreground italic">Not set</span>}
                      </p>
                    </div>
                  </div>
                );
              })()}
          </div>
        </section>

        {/* -- File picker ----------------------------------------------------- */}
        <section>
          <h3 className="text-base font-semibold mb-1">2. Select CSV File</h3>
          <p className="text-xs text-muted-foreground mb-3">Choose a CSV file to preview and validate it against the selected template.</p>
          <div className="rounded-lg border p-5 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,application/vnd.ms-excel"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting || !selectedTemplateId}
                title={!selectedTemplateId ? 'Select a template first' : undefined}
              >
                <Upload size={16} className="me-1" />
                Open CSV File
              </Button>
              {file && (
                <span className="text-sm text-muted-foreground truncate max-w-xs">
                  {file.name}
                </span>
              )}
            </div>

            {/* -- CSV preview table ------------------------------------------ */}
            {csvPreview && previewHeaders.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {/* Summary + error navigation bar */}
                {(() => {
                  const missingCols = selectedTemplate
                    ? Math.max(0, selectedTemplate.columns.length - previewHeaders.length)
                    : 0;
                  const hasIssues = cellErrors.length > 0 || missingCols > 0;
                  if (!hasIssues) {
                    return selectedTemplateId
                      ? <p className="text-xs text-green-600 font-medium">No validation errors found</p>
                      : null;
                  }
                  return (
                    <div className="flex flex-wrap items-center gap-3 bg-background border border-border rounded-md px-3 py-2 shadow-sm">
                      {missingCols > 0 && (
                        <span className="text-xs text-destructive font-medium">
                          {missingCols} missing column{missingCols !== 1 ? 's' : ''}
                        </span>
                      )}
                      {cellErrors.length > 0 && (
                        <>
                          <span className="text-xs text-destructive font-medium">
                            {cellErrors.length} format error{cellErrors.length !== 1 ? 's' : ''}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setErrorIndex((i) => Math.max(0, i - 1))}
                            disabled={errorIndex === 0}
                          >
                            <ChevronLeft size={14} className="me-1" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setErrorIndex((i) => Math.min(cellErrors.length - 1, i + 1))}
                            disabled={errorIndex >= cellErrors.length - 1}
                          >
                            Next
                            <ChevronRight size={14} className="ms-1" />
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {errorIndex + 1} / {cellErrors.length}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })()}
                {/* Current error message */}
                {cellErrors.length > 0 && cellErrors[errorIndex] && (
                  <p className="text-xs text-destructive break-all">
                    {cellErrors[errorIndex].message}
                  </p>
                )}
                {/* Scrollable viewport for the table */}
                <div className="overflow-auto max-h-72 border border-border rounded-md">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      {/* Row 1: template column names (informative) - spans ALL template cols */}
                      {selectedTemplate && (() => {
                        const sortedCols = [...selectedTemplate.columns].sort((a, b) => a.index - b.index);
                        return (
                          <tr className="bg-primary/10">
                            <th className="sticky top-0 z-10 bg-primary/10 border border-border px-2 py-1 text-left font-medium whitespace-nowrap text-primary" colSpan={1}>
                              Template columns
                            </th>
                            {Array.from({ length: totalCols }, (_, i) => {
                              const col = sortedCols[i];
                              const isMissing = i >= previewHeaders.length;
                              return (
                                <th
                                  key={i}
                                  className={[
                                    'sticky top-0 z-10 border border-border px-2 py-1 text-left font-medium whitespace-nowrap',
                                    isMissing ? 'bg-destructive/20 text-destructive' : 'bg-primary/10 text-primary',
                                  ].join(' ')}
                                  title={col ? `Template column: ${col.name}` : 'No matching template column'}
                                >
                                  {col ? col.name : <span className="italic">-</span>}
                                </th>
                              );
                            })}
                          </tr>
                        );
                      })()}
                      {/* Row 2: CSV header row - spans ALL cols */}
                      <tr className="bg-muted">
                        <th className="sticky top-0 z-10 bg-muted border border-border px-2 py-1 text-left font-medium whitespace-nowrap text-muted-foreground">
                          CSV headers
                        </th>
                        {Array.from({ length: totalCols }, (_, i) => {
                          const h = previewHeaders[i];
                          const isExtra = i >= (selectedTemplate?.columns.length ?? totalCols);
                          return (
                            <th
                              key={i}
                              className={[
                                'sticky top-0 z-10 bg-muted border border-border px-2 py-1 text-left font-medium whitespace-nowrap',
                                isExtra ? 'text-destructive' : '',
                              ].join(' ')}
                            >
                              {h != null
                                ? (h || <span className="text-muted-foreground italic">(empty)</span>)
                                : <span className="text-muted-foreground italic">-</span>}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-muted/40'}>
                          <td className="border border-border px-2 py-1 text-center text-muted-foreground select-none w-10">
                            {ri + 1}
                          </td>
                          {previewHeaders.map((_, ci) => {
                            const isErr = cellErrors.some((e) => e.row === ri && e.col === ci);
                            const isFocused =
                              cellErrors[errorIndex]?.row === ri &&
                              cellErrors[errorIndex]?.col === ci;
                            return (
                              <td
                                key={ci}
                                title={isErr ? (cellErrors.find((e) => e.row === ri && e.col === ci)?.message ?? '') : undefined}
                                className={[
                                  'border border-border px-2 py-1 whitespace-nowrap max-w-[200px] truncate',
                                  isFocused ? 'bg-destructive text-destructive-foreground font-semibold ring-2 ring-destructive' : '',
                                  isErr && !isFocused ? 'bg-destructive/20 text-destructive' : '',
                                ].join(' ')}
                              >
                                {row[ci] ?? ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* -- Submit button --------------------------------------------------- */}
        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedTemplateId || !file || cellErrors.length > 0}
          >
            {submitting ? 'Submitting...' : 'Start Import'}
          </Button>
        </div>

      </div>

      {/* -- Template picker modal -------------------------------------------- */}
      {(() => {
        const draftTemplate = templates.find((t) => String(t.id) === pickerDraftId) ?? null;
        return (
          <Dialog open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>Select Persistence Template</DialogTitle>
              </DialogHeader>

              {/* Dropdown */}
              <div className="space-y-1 pt-1">
                <Label htmlFor="picker-select">Template</Label>
                <Select
                  value={pickerDraftId}
                  onValueChange={setPickerDraftId}
                >
                  <SelectTrigger id="picker-select" className="w-full">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template details (read-only) */}
              {draftTemplate && (
                <div className="flex-1 overflow-y-auto space-y-4 mt-2 pr-1">
                  {/* Description */}
                  {draftTemplate.description && (
                    <p className="text-sm text-muted-foreground">{draftTemplate.description}</p>
                  )}

                  {/* Duplicate handling + Error handling + Target Table */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Duplicate Handling</Label>
                      <p className="text-sm font-medium">
                        {draftTemplate.duplicatesHandlingStrategy === 'REPLACE' ? 'Replace' : 'Insert'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {DUPLICATE_HANDLING_DESCRIPTIONS[draftTemplate.duplicatesHandlingStrategy]}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Error Handling</Label>
                      <p className="text-sm font-medium">
                        {draftTemplate.errorHandlingStrategy === 'STOP_ON_FIRST_ERROR_AND_ROLLBACK'
                          ? 'Revert'
                          : 'Commit'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ERROR_HANDLING_DESCRIPTIONS[draftTemplate.errorHandlingStrategy]}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Target Table</Label>
                      <p className="text-sm font-medium">
                        {draftTemplate.targetTable ?? <span className="text-muted-foreground italic">Not set</span>}
                      </p>
                    </div>
                  </div>

                  {/* Columns list */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Columns ({draftTemplate.columns.length})
                    </Label>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted text-left">
                            <th className="px-3 py-1.5 font-medium w-10">#</th>
                            <th className="px-3 py-1.5 font-medium">Name</th>
                            <th className="px-3 py-1.5 font-medium">Type</th>
                            <th className="px-3 py-1.5 font-medium">Length</th>
                            <th className="px-3 py-1.5 font-medium">Allow Null</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...draftTemplate.columns]
                            .sort((a, b) => a.index - b.index)
                            .map((col) => (
                              <tr key={col.id} className="border-t">
                                <td className="px-3 py-1.5 text-muted-foreground">{col.index + 1}</td>
                                <td className="px-3 py-1.5 font-medium">{col.name}</td>
                                <td className="px-3 py-1.5 text-muted-foreground">{col.type ?? '-'}</td>
                                <td className="px-3 py-1.5 text-muted-foreground">{col.length ?? '-'}</td>
                                <td className="px-3 py-1.5 text-muted-foreground">{col.allowNull ? 'Yes' : 'No'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2 gap-2">
                <Button variant="outline" onClick={() => setTemplatePickerOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!pickerDraftId}
                  onClick={() => {
                    setSelectedTemplateId(pickerDraftId);
                    setTemplatePickerOpen(false);
                  }}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

    </div>
  );
}
