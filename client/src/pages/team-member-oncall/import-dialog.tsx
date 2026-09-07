import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Download } from 'lucide-react';
import type {
  TeamMemberOncallExternalEntryDTO,
  SubmitTeamMemberOncallExternalEntriesDTO,
  SubmitTeamMemberOncallExternalEntriesResponseDTO,
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

const TEMPLATE_HEADERS = ['Workday ID', 'Amount', 'Date', 'Frequency'];
const TEMPLATE_EXAMPLE_ROW = ['12345', '150.00', '2026-01-01', '1'];
const TEMPLATE_CSV = `${TEMPLATE_HEADERS.join(',')}\n${TEMPLATE_EXAMPLE_ROW.join(',')}\n`;

const HEADER_TO_FIELD: Record<string, keyof TeamMemberOncallExternalEntryDTO> = {
  'workday id': 'workdayId',
  amount: 'amount',
  date: 'date',
  frequency: 'frequency',
};

interface PreviewRow {
  entry: TeamMemberOncallExternalEntryDTO;
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

function buildEntryIssues(entry: TeamMemberOncallExternalEntryDTO): string | null {
  const issues: string[] = [];
  if (!entry.workdayId) issues.push('missing Workday ID');
  if (Number.isNaN(entry.amount)) issues.push('invalid amount');
  if (!entry.date) issues.push('missing date');
  if (!Number.isInteger(entry.frequency) || entry.frequency <= 0) issues.push('invalid frequency');
  return issues.length ? issues.join(', ') : null;
}

interface OncallImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function OncallImportDialog({ open, onOpenChange, onImported }: OncallImportDialogProps) {
  const { toast } = useToast();
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedEntries, setParsedEntries] = useState<TeamMemberOncallExternalEntryDTO[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [importResult, setImportResult] = useState<SubmitTeamMemberOncallExternalEntriesResponseDTO | null>(null);

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
      setParsedEntries([]);
      setPreviewRows([]);
      setTotalRows(0);
      setImportResult(null);
    }
  }, [open, reset]);

  const resetParsedState = () => {
    setParsedEntries([]);
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
      const columnIndex: Partial<Record<keyof TeamMemberOncallExternalEntryDTO, number>> = {};
      for (const [label, field] of Object.entries(HEADER_TO_FIELD)) {
        const idx = headerCells.indexOf(label);
        if (idx === -1) {
          setParseError(`Missing required column "${label}" in the CSV header.`);
          resetParsedState();
          return;
        }
        columnIndex[field] = idx;
      }

      const entries: TeamMemberOncallExternalEntryDTO[] = [];
      const preview: PreviewRow[] = [];

      lines.slice(1).forEach((line) => {
        const cells = parseCsvLine(line);
        const workdayId = (cells[columnIndex.workdayId as number] ?? '').trim();
        const amountRaw = (cells[columnIndex.amount as number] ?? '').trim();
        const date = (cells[columnIndex.date as number] ?? '').trim();
        const frequencyRaw = (cells[columnIndex.frequency as number] ?? '').trim();

        const entry: TeamMemberOncallExternalEntryDTO = {
          workdayId,
          amount: amountRaw === '' ? NaN : Number(amountRaw),
          date,
          frequency: frequencyRaw === '' ? NaN : Number(frequencyRaw),
        };

        entries.push(entry);
        if (preview.length < MAX_PREVIEW_ROWS) {
          preview.push({ entry, issue: buildEntryIssues(entry) });
        }
      });

      setParsedEntries(entries);
      setPreviewRows(preview);
      setTotalRows(entries.length);
    };
    reader.onerror = () => {
      setParseError('Failed to read the file.');
      resetParsedState();
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'team-member-oncall-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const onSubmit = async () => {
    if (parsedEntries.length === 0) return;

    try {
      const result = await apiPost<
        SubmitTeamMemberOncallExternalEntriesResponseDTO,
        SubmitTeamMemberOncallExternalEntriesDTO
      >('/api/team-member-oncall/import', { entries: parsedEntries });

      setImportResult(result);

      if (result.insertedCount > 0) {
        onImported();
      }

      if (result.failedCount === 0) {
        toast({ title: 'Success', description: `${result.insertedCount} on call record(s) imported successfully.` });
        onOpenChange(false);
      } else {
        toast({
          title: result.insertedCount > 0 ? 'Partially imported' : 'Import failed',
          description: `${result.insertedCount} imported, ${result.failedCount} failed. See details below.`,
          variant: result.insertedCount > 0 ? 'default' : 'destructive',
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to import on call records';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import On Call Records</DialogTitle>
          <DialogDescription>Upload a CSV file to bulk-create on call records.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="oncall-import-file">
                CSV File <span className="text-destructive">*</span>
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
            <Input
              id="oncall-import-file"
              type="file"
              accept=".csv,text/csv,text/plain"
              {...fileField}
              onChange={(event) => {
                fileField.onChange(event);
                handleFileChange(event);
              }}
            />
            {errors.file && <p className="text-sm text-destructive">{errors.file.message}</p>}
            {parseError && <p className="text-sm text-destructive">{parseError}</p>}

            {previewRows.length > 0 && (
              <div className="rounded-md border max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="p-2 text-left font-medium">Workday ID</th>
                      <th className="p-2 text-left font-medium">Amount</th>
                      <th className="p-2 text-left font-medium">Date</th>
                      <th className="p-2 text-left font-medium">Frequency</th>
                      <th className="p-2 text-left font-medium">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, index) => (
                      <tr key={index} className={row.issue ? 'bg-destructive/10' : undefined}>
                        <td className="p-2">{row.entry.workdayId || '-'}</td>
                        <td className="p-2">{Number.isNaN(row.entry.amount) ? '-' : row.entry.amount}</td>
                        <td className="p-2">{row.entry.date || '-'}</td>
                        <td className="p-2">{Number.isNaN(row.entry.frequency) ? '-' : row.entry.frequency}</td>
                        <td className="p-2 text-destructive">{row.issue ?? ''}</td>
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
                  {importResult.insertedCount} imported, {importResult.failedCount} failed.
                </p>
                {importResult.failedCount > 0 && (
                  <ul className="list-disc pl-4 text-destructive">
                    {importResult.results
                      .filter((r) => !r.success)
                      .map((r) => (
                        <li key={r.index}>
                          {r.workdayId || `Row ${r.index + 1}`}: {r.error}
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
            <Button type="submit" disabled={isSubmitting || parsedEntries.length === 0}>
              {isSubmitting ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
