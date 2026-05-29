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
import { decodeCsvArrayBuffer } from '@/lib/decodeCsvFile';

// --- CSV preview helpers ------------------------------------------------------

const CSV_PREVIEW_ROWS = 25;

/** Splits a single delimited line respecting double-quoted fields. */
function parseCsvLine(line: string, separator: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && line.startsWith(separator, i)) {
      result.push(current);
      current = '';
      i += separator.length - 1;
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

function parseCsvPreview(text: string, separator: string = ','): CsvPreview {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0] ?? '', separator);
  const dataLines = lines.slice(1).slice(0, CSV_PREVIEW_ROWS);
  const rows = dataLines.map((l) => parseCsvLine(l, separator));
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
  regularExpression: string | null;
  example: string | null;
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

  // Build a map from CSV header name (lowercase) -> column index for header-mode.
  const headerIndexMap = new Map<string, number>(
    preview.headers.map((h, i) => [h.trim().toLowerCase(), i]),
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

    // Resolve the CSV column position based on the template's header mode.
    let colIndex: number;
    if (template.hasCsvHeader) {
      // Match by csvColumnName against the CSV file's header row.
      if (!col.csvColumnName || col.csvColumnName.trim() === '') continue;
      const pos = headerIndexMap.get(col.csvColumnName.trim().toLowerCase());
      if (pos === undefined) continue; // column not found in CSV headers
      colIndex = pos;
    } else {
      // Match by csvColumnIndex (0-based position).
      if (col.csvColumnIndex == null || col.csvColumnIndex === -1) continue;
      colIndex = col.csvColumnIndex;
    }

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
          regularExpression: dt.regularExpression,
          example: dt.example,
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
  const [fileText, setFileText] = useState<string | null>(null);
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

  // Toggle to hide CSV columns that have no matching template column.
  // Default true: only matched columns are shown when the file first loads.
  const [hideUnmapped, setHideUnmapped] = useState(true);

  // Column detail modal
  interface ColDetail {
    name: string;
    type: string | null;
    length: number | null;
    allowNull: boolean;
    dtName: string | null;
    dtRegex: string | null;
    dtExample: string | null;
  }
  const [colDetail, setColDetail] = useState<ColDetail | null>(null);

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

  // -- Re-parse file when the template changes (separator may differ) -----------

  useEffect(() => {
    if (!fileText) return;
    const tpl = selectedTemplateId
      ? templates.find((t) => String(t.id) === selectedTemplateId) ?? null
      : null;
    const sep = tpl?.separator ?? ',';
    setCsvPreview(parseCsvPreview(fileText, sep));
  }, [selectedTemplateId, templates]); // eslint-disable-line react-hooks/exhaustive-deps

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
    e.target.value = '';
    setFile(selected);

    if (!selected) {
      setFileText(null);
      setCsvPreview(null);
      return;
    }

    const tpl = selectedTemplateId
      ? templates.find((t) => String(t.id) === selectedTemplateId) ?? null
      : null;
    const sep = tpl?.separator ?? ',';

    const reader = new FileReader();
    reader.onload = (ev) => {
      const arrayBuffer = ev.target?.result;
      if (arrayBuffer instanceof ArrayBuffer) {
        const text = decodeCsvArrayBuffer(arrayBuffer);
        setFileText(text);
        setCsvPreview(parseCsvPreview(text, sep));
      }
    };
    reader.readAsArrayBuffer(selected);
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

  // Total columns = max(csv columns, template span) so both are fully shown.
  // When hasCsvHeader=No, template columns are placed by csvColumnIndex, so
  // totalCols must cover the highest csvColumnIndex in use, not just the count.
  const selectedTemplate = selectedTemplateId
    ? templates.find((t) => String(t.id) === selectedTemplateId) ?? null
    : null;
  const templateSpan = selectedTemplate
    ? selectedTemplate.hasCsvHeader
      ? selectedTemplate.columns.length
      : Math.max(
          0,
          ...selectedTemplate.columns
            .map((c) => (c.csvColumnIndex != null && c.csvColumnIndex !== -1 ? c.csvColumnIndex + 1 : 0)),
        )
    : 0;
  const previewHeaders = csvPreview?.headers ?? [];
  // When the template has no CSV header every line in the file is data.
  // parseCsvPreview() always consumes line 0 as headers, so we prepend it
  // back into the rows array so the first data row is not hidden.
  const previewRows = csvPreview
    ? (selectedTemplate && !selectedTemplate.hasCsvHeader
        ? [previewHeaders, ...csvPreview.rows]
        : csvPreview.rows)
    : [];

  const totalCols = Math.max(previewHeaders.length, templateSpan);

  // When hideUnmapped is on, compute the set of column indices that have a
  // matching template column, so we can skip the rest.
  // A column index is "mapped" when the csvIndexMap would place a template
  // column there. We recompute this here (same logic as inside the thead) so
  // the body rows can also filter by the same set.
  const mappedColIndices: Set<number> | null = (() => {
    if (!hideUnmapped || !selectedTemplate) return null;
    if (!selectedTemplate.hasCsvHeader) {
      return new Set(
        selectedTemplate.columns
          .filter((c) => c.csvColumnIndex != null && c.csvColumnIndex !== -1)
          .map((c) => c.csvColumnIndex as number),
      );
    }
    // hasCsvHeader=Yes: map by name match
    const headerPositionMap = new Map<string, number>(
      previewHeaders.map((h, i) => [h.trim().toLowerCase(), i]),
    );
    const indices = new Set<number>();
    for (const c of selectedTemplate.columns) {
      if (c.csvColumnName && c.csvColumnName.trim() !== '') {
        const pos = headerPositionMap.get(c.csvColumnName.trim().toLowerCase());
        if (pos !== undefined) indices.add(pos);
      }
    }
    return indices;
  })();

  // Indices of columns to actually render (all when mappedColIndices is null)
  const visibleColIndices = Array.from({ length: totalCols }, (_, i) => i).filter(
    (i) => mappedColIndices === null || mappedColIndices.has(i),
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
                const sepLabel = tpl.separator === '\t' ? 'Tab'
                  : tpl.separator === ';' ? 'Semicolon (;)'
                  : tpl.separator === '|' ? 'Pipe (|)'
                  : 'Comma (,)';
                return (
                  <div className="grid grid-cols-4 gap-4 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Separator</Label>
                      <p className="text-sm font-medium">{sepLabel}</p>
                    </div>
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
          <h3 className="text-base font-semibold mb-1">2. Select File</h3>
          <p className="text-xs text-muted-foreground mb-3">Choose a file to preview and validate it against the selected template. Supported formats: CSV, TSV, TXT.</p>
          <div className="rounded-lg border p-5 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values,application/vnd.ms-excel"
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
                Open File
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
                    {/* Static hint label */}
                    <p className="text-xs text-muted-foreground">
                      Click on a template column header to see more details about its data type.
                    </p>
                    {/* Toggle button for unmapped columns */}
                    {selectedTemplate && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setHideUnmapped((v) => !v)}
                        >
                          {hideUnmapped ? 'Show unmatched columns' : 'Hide unmatched columns'}
                        </Button>
                      </div>
                    )}
                    {/* Summary + error navigation bar */}
                {(() => {
                  const missingCols = selectedTemplate
                    ? Math.max(0, selectedTemplate.columns.length - previewHeaders.length)
                    : 0;
                  const hasIssues = cellErrors.length > 0 || missingCols > 0;
                  if (!hasIssues) {
                    return selectedTemplateId
                      ? <p className="text-xs text-uds-system-green-600 font-medium">No validation errors found</p>
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
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 space-y-0.5">
                    <p className="text-xs text-destructive break-all font-medium">
                      {cellErrors[errorIndex].message}
                    </p>
                    {cellErrors[errorIndex].regularExpression && (
                      <p className="text-xs text-muted-foreground break-all">
                        Expected format: <code className="font-mono">{cellErrors[errorIndex].regularExpression}</code>
                      </p>
                    )}
                    {cellErrors[errorIndex].example && (
                      <p className="text-xs text-muted-foreground">
                        Example: <code className="font-mono">{cellErrors[errorIndex].example}</code>
                      </p>
                    )}
                  </div>
                )}
                {/* No-match info banner */}
                {hideUnmapped && visibleColIndices.length === 0 && selectedTemplate && (
                  <div className="flex items-start gap-2 rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                    <span>
                      No columns matched between the CSV file and the selected template.
                      Review the template column configuration or click{' '}
                      <strong>"Show unmatched columns"</strong> to inspect all CSV columns.
                    </span>
                  </div>
                )}
                {/* Scrollable viewport for the table */}
                {(!hideUnmapped || visibleColIndices.length > 0) && (
                <div className="overflow-auto max-h-72 border border-border rounded-md">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      {/* Row 1: template column names (informative) - spans ALL template cols */}
                      {selectedTemplate && (() => {
                        const sortedCols = [...selectedTemplate.columns].sort((a, b) => a.index - b.index);
                        // When hasCsvHeader=No: map csvColumnIndex -> column (position-based).
                        // When hasCsvHeader=Yes: map display position -> column by matching
                        //   the CSV header name at that position to col.csvColumnName.
                        let csvIndexMap: Map<number, typeof sortedCols[0]> | null = null;
                        if (!selectedTemplate.hasCsvHeader) {
                          csvIndexMap = new Map(
                            selectedTemplate.columns
                              .filter((c) => c.csvColumnIndex != null && c.csvColumnIndex !== -1)
                              .map((c) => [c.csvColumnIndex as number, c]),
                          );
                        } else {
                          // Build a map: CSV header name (lowercase) -> display position index
                          const headerPositionMap = new Map<string, number>(
                            previewHeaders.map((h, i) => [h.trim().toLowerCase(), i]),
                          );
                          csvIndexMap = new Map(
                            selectedTemplate.columns
                              .filter((c) => c.csvColumnName != null && c.csvColumnName.trim() !== '')
                              .flatMap((c) => {
                                const pos = headerPositionMap.get((c.csvColumnName as string).trim().toLowerCase());
                                return pos !== undefined ? [[pos, c] as [number, typeof c]] : [];
                              }),
                          );
                        }
                        return (
                          <tr className="bg-primary/10">
                            <th className="sticky top-0 z-10 bg-primary/10 border border-border px-2 py-1 text-left font-medium whitespace-nowrap text-primary" colSpan={1}>
                              Template columns
                            </th>
                            {visibleColIndices.map((i) => {
                              const col = csvIndexMap ? csvIndexMap.get(i) : sortedCols[i];
                              const isMissing = i >= previewHeaders.length;
                              return (
                                <th
                                  key={i}
                                  className={[
                                    'sticky top-0 z-10 border border-border px-2 py-1 text-left font-medium whitespace-nowrap',
                                    isMissing ? 'bg-destructive/20 text-destructive' : 'bg-primary/10 text-primary',
                                    col ? 'cursor-pointer hover:brightness-95' : '',
                                  ].join(' ')}
                                  title={col ? `Click to see details for ${col.name}` : 'No matching template column'}
                                  onClick={() => {
                                    if (!col) return;
                                    const dt = col.type
                                      ? dataTypes.find((d) => d.name.toLowerCase() === col.type!.toLowerCase()) ?? null
                                      : null;
                                    setColDetail({
                                      name: col.name,
                                      type: col.type ?? null,
                                      length: col.length ?? null,
                                      allowNull: col.allowNull,
                                      dtName: dt?.name ?? null,
                                      dtRegex: dt?.regularExpression ?? null,
                                      dtExample: dt?.example ?? null,
                                    });
                                  }}
                                >
                                  {col ? (
                                    <>
                                      {col.name}
                                      {col.type && (
                                        <span className="font-normal opacity-70"> ({col.type})</span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="italic">-</span>
                                  )}
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
                        {visibleColIndices.map((i) => {
                          const h = previewHeaders[i];
                          const isExtra = i >= (selectedTemplate?.columns.length ?? totalCols);
                          const cellContent = selectedTemplate && !selectedTemplate.hasCsvHeader
                            ? <span className="text-muted-foreground">{i}</span>
                            : h != null
                              ? (h || <span className="text-muted-foreground italic">(empty)</span>)
                              : <span className="text-muted-foreground italic">-</span>;
                          return (
                            <th
                              key={i}
                              className={[
                                'sticky top-0 z-10 bg-muted border border-border px-2 py-1 text-left font-medium whitespace-nowrap',
                                isExtra ? 'text-destructive' : '',
                              ].join(' ')}
                            >
                              {cellContent}
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
                          {visibleColIndices.map((ci) => {
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
                )}
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

      {/* -- Column detail modal --------------------------------------------- */}
      <Dialog open={!!colDetail} onOpenChange={(open) => { if (!open) setColDetail(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Column Details</DialogTitle>
          </DialogHeader>
          {colDetail && (
            <div className="space-y-3 py-2">
              {/* Column info */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Name</p>
                  <p className="font-medium">{colDetail.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Type</p>
                  <p className="font-medium">{colDetail.type ?? <span className="italic text-muted-foreground">-</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Length</p>
                  <p className="font-medium">{colDetail.length != null ? colDetail.length : <span className="italic text-muted-foreground">-</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Allow Null</p>
                  <p className="font-medium">{colDetail.allowNull ? 'Yes' : 'No'}</p>
                </div>
              </div>
              {/* Datatype info */}
              {(colDetail.dtName || colDetail.dtRegex || colDetail.dtExample) && (
                <div className="border-t pt-3 space-y-2">
                  {colDetail.dtRegex && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Regular Expression</p>
                      <code className="block text-xs font-mono bg-muted rounded px-2 py-1 break-all">{colDetail.dtRegex}</code>
                    </div>
                  )}
                  {colDetail.dtExample && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Example</p>
                      <code className="text-xs font-mono bg-muted rounded px-2 py-1">{colDetail.dtExample}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setColDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

                  {/* Duplicate handling + Error handling + Includes CSV Header + Separator + Target Table */}
                  <div className="grid grid-cols-5 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Separator</Label>
                      <p className="text-sm font-medium">
                        {draftTemplate.separator === '\t' ? 'Tab'
                          : draftTemplate.separator === ';' ? 'Semicolon (;)'
                          : draftTemplate.separator === '|' ? 'Pipe (|)'
                          : 'Comma (,)'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Includes CSV Header</Label>
                      <p className="text-sm font-medium">
                        {draftTemplate.hasCsvHeader ? 'Yes' : 'No'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {draftTemplate.hasCsvHeader
                          ? 'Columns matched by CSV column name'
                          : 'Columns matched by CSV column Index'}
                      </p>
                    </div>
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
                            <th className="px-3 py-1.5 font-medium">
                              {draftTemplate.hasCsvHeader ? 'CSV Column Name' : 'CSV Column Index'}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...draftTemplate.columns]
                            .sort((a, b) => a.index - b.index)
                            .map((col, colPos) => (
                              <tr key={col.id} className="border-t">
                                <td className="px-3 py-1.5 text-muted-foreground">{colPos}</td>
                                <td className="px-3 py-1.5 font-medium">{col.name}</td>
                                <td className="px-3 py-1.5 text-muted-foreground">{col.type ?? '-'}</td>
                                <td className="px-3 py-1.5 text-muted-foreground">{col.length ?? '-'}</td>
                                <td className="px-3 py-1.5 text-muted-foreground">{col.allowNull ? 'Yes' : 'No'}</td>
                                <td className="px-3 py-1.5 text-muted-foreground">
                                  {draftTemplate.hasCsvHeader
                                    ? (col.csvColumnName ?? <span className="italic">-</span>)
                                    : (col.csvColumnIndex != null && col.csvColumnIndex !== -1
                                        ? col.csvColumnIndex
                                        : <span className="italic">-</span>)}
                                </td>
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
