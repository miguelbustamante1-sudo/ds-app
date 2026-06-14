import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { AlertCircle, CheckCircle2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { ValidateResponseDTO } from '@shared/dto/DynamicReport';
import { validateSql } from '../api';

interface Step1SqlEditorProps {
  sql: string;
  onSqlChange: (sql: string) => void;
  onValidated: (result: ValidateResponseDTO) => void;
  validationResult: ValidateResponseDTO | null;
  sqlDirtyAfterValidation: boolean;
}

export function Step1SqlEditor({
  sql,
  onSqlChange,
  onValidated,
  validationResult,
  sqlDirtyAfterValidation,
}: Step1SqlEditorProps) {
  const { resolvedTheme } = useTheme();
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleValidate() {
    if (!sql.trim()) return;
    setValidating(true);
    setError(null);
    try {
      const result = await validateSql(sql);
      if (result.valid) {
        onValidated(result);
      } else {
        setError(result.error ?? 'SQL validation failed');
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to validate SQL');
    } finally {
      setValidating(false);
    }
  }

  const isValid = validationResult?.valid && !sqlDirtyAfterValidation;

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-hidden resize-y h-80 min-h-[160px] max-h-[800px] overflow-hidden">
        <Editor
          height="100%"
          language="sql"
          value={sql}
          onChange={(value) => onSqlChange(value ?? '')}
          theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleValidate} disabled={validating || !sql.trim()} size="sm">
          <Play className="mr-1 h-4 w-4" />
          {validating ? 'Validating...' : 'Validate & Preview'}
        </Button>

        {isValid && (
          <span className="flex items-center gap-1 text-sm text-uds-system-green-600">
            <CheckCircle2 className="h-4 w-4" />
            SQL validated
          </span>
        )}

        {sqlDirtyAfterValidation && validationResult?.valid && (
          <span className="text-sm text-uds-system-amber-500">SQL changed — please re-validate</span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <pre className="whitespace-pre-wrap font-mono text-xs">{error}</pre>
        </div>
      )}

      {isValid && validationResult && (
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Detected Columns
            </p>
            <div className="rounded-md border bg-muted/30 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {validationResult.columns.map((col) => (
                      <th key={col} className="px-3 py-2 text-left font-medium text-xs">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {validationResult.columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-muted-foreground text-xs italic">
                        —
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {validationResult.parameters.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Detected Parameters
              </p>
              <div className="flex flex-wrap gap-2">
                {validationResult.parameters.map((p) => (
                  <Badge key={p} variant="outline" className="font-mono text-xs">
                    {'{'}
                    {p}
                    {'}'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
