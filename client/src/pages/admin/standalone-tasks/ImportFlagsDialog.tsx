import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type {
  FlagIntakeRowDTO,
  SubmitFlagIntakeDTO,
  SubmitFlagIntakeResponseDTO,
} from '@shared/dto';
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
import { useToast } from '@/hooks/use-toast';
import { apiPost } from '@/lib/api';
import { decodeCsvArrayBuffer } from '@/lib/decodeCsvFile';

const MAX_PREVIEW_ROWS = 50;

// Required columns must be present in the CSV header; optional ones default to null when absent.
const REQUIRED_HEADER_TO_FIELD: Record<string, keyof FlagIntakeRowDTO> = {
  category: 'category',
  concatenate: 'concatenate',
  'ti supervisor': 'tiSupervisor',
  report: 'report',
};
const OPTIONAL_HEADER_TO_FIELD: Record<string, keyof FlagIntakeRowDTO> = {
  tenure: 'tenure',
  om: 'om',
  'latest waiver eta': 'latestWaiverEta',
  'latest waiver status': 'latestWaiverStatus',
};

interface PreviewRow {
  row: FlagIntakeRowDTO;
  issue: string | null;
}

interface ImportFormData {
  file: FileList;
}

function parseCsvLine(line: string, separator = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === separator) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function buildRowIssues(row: FlagIntakeRowDTO): string | null {
  const issues: string[] = [];
  if (!row.concatenate) issues.push('missing Concatenate');
  else if (!/^\d+-/.test(row.concatenate)) issues.push("Concatenate doesn't start with a Workday ID");
  if (!row.tiSupervisor) issues.push('missing TI Supervisor');
  if (!row.report) issues.push('missing Report');
  return issues.length ? issues.join(', ') : null;
}

interface ImportFlagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportFlagsDialog({ open, onOpenChange, onImported }: ImportFlagsDialogProps) {
  const { toast } = useToast();
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<FlagIntakeRowDTO[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [importResult, setImportResult] = useState<SubmitFlagIntakeResponseDTO | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ImportFormData>();

  const fileField = register('file', { required: 'Please select a CSV file to import.' });

  useEffect(() => {
    if (open) {
      reset();
      setParseError(null);
      setParsedRows([]);
      setPreviewRows([]);
      setTotalRows(0);
      setImportResult(null);
    }
  }, [open, reset]);

  const resetParsedState = () => {
    setParsedRows([]);
    setPreviewRows([]);
    setTotalRows(0);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    setImportResult(null);

    const file = event.target.files?.[0];
    if (!file) {
      resetParsedState();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = decodeCsvArrayBuffer(reader.result as ArrayBuffer);
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

      if (lines.length < 2) {
        setParseError('The file must contain a header row and at least one data row.');
        resetParsedState();
        return;
      }

      const headerCells = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
      const columnIndex: Partial<Record<keyof FlagIntakeRowDTO, number>> = {};

      for (const [label, field] of Object.entries(REQUIRED_HEADER_TO_FIELD)) {
        const idx = headerCells.indexOf(label);
        if (idx === -1) {
          setParseError(`Missing required column "${label}" in the CSV header.`);
          resetParsedState();
          return;
        }
        columnIndex[field] = idx;
      }
      for (const [label, field] of Object.entries(OPTIONAL_HEADER_TO_FIELD)) {
        const idx = headerCells.indexOf(label);
        if (idx !== -1) columnIndex[field] = idx;
      }

      const cell = (cells: string[], field: keyof FlagIntakeRowDTO): string => {
        const idx = columnIndex[field];
        return idx === undefined ? '' : (cells[idx] ?? '').trim();
      };
      const optionalCell = (cells: string[], field: keyof FlagIntakeRowDTO): string | null => {
        const value = cell(cells, field);
        return value === '' ? null : value;
      };

      const rows: FlagIntakeRowDTO[] = [];
      const preview: PreviewRow[] = [];

      lines.slice(1).forEach((line) => {
        const cells = parseCsvLine(line);
        const row: FlagIntakeRowDTO = {
          category: cell(cells, 'category'),
          concatenate: cell(cells, 'concatenate'),
          tiSupervisor: cell(cells, 'tiSupervisor'),
          report: cell(cells, 'report'),
          tenure: optionalCell(cells, 'tenure'),
          om: optionalCell(cells, 'om'),
          latestWaiverEta: optionalCell(cells, 'latestWaiverEta'),
          latestWaiverStatus: optionalCell(cells, 'latestWaiverStatus'),
        };

        rows.push(row);
        if (preview.length < MAX_PREVIEW_ROWS) {
          preview.push({ row, issue: buildRowIssues(row) });
        }
      });

      setParsedRows(rows);
      setPreviewRows(preview);
      setTotalRows(rows.length);
    };
    reader.onerror = () => {
      setParseError('Failed to read the file.');
      resetParsedState();
    };
    reader.readAsArrayBuffer(file);
  };

  const onSubmit = async () => {
    if (parsedRows.length === 0) return;

    try {
      const result = await apiPost<SubmitFlagIntakeResponseDTO, SubmitFlagIntakeDTO>(
        '/api/flag-intake/import',
        { rows: parsedRows },
      );

      setImportResult(result);

      if (result.insertedCount > 0) {
        onImported();
      }

      if (result.failedCount === 0) {
        const dupNote = result.duplicateCount > 0 ? `, ${result.duplicateCount} already open` : '';
        toast({
          title: 'Success',
          description: `${result.insertedCount} flag task(s) created${dupNote}.`,
        });
        onOpenChange(false);
      } else {
        toast({
          title: result.insertedCount > 0 ? 'Partially imported' : 'Import failed',
          description: `${result.insertedCount} created, ${result.duplicateCount} already open, ${result.failedCount} failed. See details below.`,
          variant: result.insertedCount > 0 ? 'default' : 'destructive',
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to import flags';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Flags</DialogTitle>
          <DialogDescription>
            Upload the tenure/flags summary CSV to bulk-create standalone tasks. The flagged team
            member is resolved from the Workday ID in "Concatenate"; the assignee is matched from
            "TI Supervisor" against the team member table.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="flags-import-file">
                CSV File <span className="text-destructive">*</span>
              </Label>
              <Input
                id="flags-import-file"
                type="file"
                accept=".csv,text/csv,text/plain"
                {...fileField}
                onChange={(event) => {
                  fileField.onChange(event);
                  handleFileChange(event);
                }}
              />
            </div>
            {errors.file && <p className="text-sm text-destructive">{errors.file.message}</p>}
            {parseError && <p className="text-sm text-destructive">{parseError}</p>}

            {previewRows.length > 0 && (
              <div className="rounded-md border max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="p-2 text-left font-medium">Category</th>
                      <th className="p-2 text-left font-medium">Report</th>
                      <th className="p-2 text-left font-medium">TI Supervisor</th>
                      <th className="p-2 text-left font-medium">Tenure</th>
                      <th className="p-2 text-left font-medium">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((preview, idx) => (
                      <tr key={idx} className={preview.issue ? 'bg-destructive/10' : undefined}>
                        <td className="p-2">{preview.row.category || '-'}</td>
                        <td className="p-2">{preview.row.report || '-'}</td>
                        <td className="p-2">{preview.row.tiSupervisor || '-'}</td>
                        <td className="p-2">{preview.row.tenure ?? '-'}</td>
                        <td className="p-2 text-destructive">{preview.issue ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {totalRows > previewRows.length && (
              <p className="text-xs text-muted-foreground">
                +{totalRows - previewRows.length} more row(s) not shown in preview.
              </p>
            )}

            {importResult && (
              <div className="rounded-md border p-3 text-sm space-y-2">
                <p>
                  {importResult.insertedCount} created, {importResult.duplicateCount} already
                  open, {importResult.failedCount} failed.
                </p>
                {importResult.failedCount > 0 && (
                  <ul className="list-disc pl-4 text-destructive">
                    {importResult.results
                      .filter((r) => r.status === 'failed')
                      .map((r) => (
                        <li key={r.index}>
                          Row {r.index + 1}: {r.error}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Close
            </Button>
            <Button type="submit" disabled={isSubmitting || parsedRows.length === 0}>
              {isSubmitting ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
