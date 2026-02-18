import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportButtonProps {
  searchParams: URLSearchParams;
  baseEndpoint: string;    // e.g. '/api/reports/time-off/change-log'
  filenamePrefix: string;  // e.g. 'timeoff-changelog-employee'
}

const EXPORT_CAP = 50_000;

async function fetchExportData(url: string): Promise<unknown[]> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  // Warn if capped
  if (res.headers.get('X-Export-Capped') === 'true') {
    console.warn(`Export capped at ${EXPORT_CAP} rows. Download may be incomplete.`);
  }
  return res.json();
}

function buildExportUrl(baseEndpoint: string, searchParams: URLSearchParams): string {
  const params = new URLSearchParams(searchParams);
  // Strip pagination params — not relevant for export
  params.delete('page');
  params.delete('pageSize');
  params.delete('run');
  params.set('export', 'true');
  return `${baseEndpoint}?${params.toString()}`;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function ExportButton({ searchParams, baseEndpoint, filenamePrefix }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport(format: 'xlsx' | 'csv') {
    setExporting(true);
    try {
      const url = buildExportUrl(baseEndpoint, searchParams);
      const rows = await fetchExportData(url);

      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');

      const filename = `${filenamePrefix}-${todayStr()}.${format}`;
      XLSX.writeFile(wb, filename, { bookType: format });
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('xlsx')}>
          Export XLSX
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          Export CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
