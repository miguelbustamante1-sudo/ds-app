import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getReport, createReport, updateReport } from '../api';
import { Step1SqlEditor } from './Step1SqlEditor';
import { Step2Parameters } from './Step2Parameters';
import { Step3Metadata } from './Step3Metadata';
import type { WizardState, WizardParameter } from './types';
import type { ValidateResponseDTO, ReportParameterDTO } from '@shared/dto/DynamicReport';
import type { SelectOptions } from '@shared/dto/DynamicReport';

const INITIAL_STATE: WizardState = {
  sql: '',
  validationResult: null,
  sqlDirtyAfterValidation: false,
  parameters: [],
  reportName: '',
  reportDescription: '',
  reportGroup: '',
  reportPermission: '',
  reportActive: true,
};

function parseParamOptions(dto: ReportParameterDTO): Pick<WizardParameter, 'selectSource' | 'staticOptions' | 'queryOptions'> {
  if (!dto.parameterOptions) return {};
  try {
    const parsed: SelectOptions = JSON.parse(dto.parameterOptions);
    if (parsed.source === 'static') {
      return { selectSource: 'static', staticOptions: JSON.stringify(parsed.options, null, 2) };
    }
    if (parsed.source === 'query') {
      return { selectSource: 'query', queryOptions: parsed.query };
    }
  } catch {}
  return {};
}

function buildParamOptions(param: WizardParameter): string | null {
  if (param.parameterType !== 'select') return null;
  const source = param.selectSource ?? 'static';
  if (source === 'static') {
    try {
      const parsed = JSON.parse(param.staticOptions ?? '[]');
      const opts: SelectOptions = { source: 'static', options: parsed };
      return JSON.stringify(opts);
    } catch {
      return null;
    }
  }
  const opts: SelectOptions = { source: 'query', query: param.queryOptions ?? '' };
  return JSON.stringify(opts);
}

export function ReportWizard() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  // Load existing report in edit mode
  useEffect(() => {
    if (!isEditMode || !id) return;
    getReport(Number(id))
      .then((report) => {
        const params: WizardParameter[] = report.parameters.map((p) => ({
          parameterName: p.parameterName,
          parameterLabel: p.parameterLabel,
          parameterType: p.parameterType,
          parameterRequired: p.parameterRequired,
          parameterDefault: p.parameterDefault,
          parameterOrder: p.parameterOrder,
          ...parseParamOptions(p),
        }));

        // Synthesize a validation result so step 1 shows as validated
        const validationResult: ValidateResponseDTO = {
          valid: true,
          columns: [],
          parameters: params.map((p) => p.parameterName),
        };

        setState({
          sql: report.reportSqlQuery,
          validationResult,
          sqlDirtyAfterValidation: false,
          parameters: params,
          reportName: report.reportName,
          reportDescription: report.reportDescription ?? '',
          reportGroup: report.reportGroup,
          reportPermission: report.reportPermission ?? '',
          reportActive: report.reportActive,
        });
      })
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load report', variant: 'destructive' });
        navigate('/reports/dynamic');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Sync detected params when validation succeeds
  function handleValidated(result: ValidateResponseDTO) {
    setState((prev) => {
      const existingMap = new Map(prev.parameters.map((p) => [p.parameterName, p]));
      const newParams: WizardParameter[] = result.parameters.map((name, idx) => {
        const existing = existingMap.get(name);
        return existing ?? {
          parameterName: name,
          parameterLabel: name,
          parameterType: 'text',
          parameterRequired: true,
          parameterDefault: null,
          parameterOrder: idx + 1,
        };
      });
      return { ...prev, validationResult: result, sqlDirtyAfterValidation: false, parameters: newParams };
    });
  }

  function handleSqlChange(sql: string) {
    setState((prev) => ({
      ...prev,
      sql,
      sqlDirtyAfterValidation: prev.validationResult?.valid ? true : prev.sqlDirtyAfterValidation,
    }));
  }

  async function handleSave() {
    if (!state.reportName.trim()) {
      setNameError('Name is required');
      return;
    }
    setNameError('');
    setSaving(true);
    try {
      const payload = {
        reportName: state.reportName.trim(),
        reportDescription: state.reportDescription || null,
        reportGroup: state.reportGroup,
        reportSqlQuery: state.sql,
        reportActive: state.reportActive,
        reportPermission: state.reportPermission || null,
        parameters: state.parameters.map((p) => ({
          parameterName: p.parameterName,
          parameterLabel: p.parameterLabel,
          parameterType: p.parameterType,
          parameterRequired: p.parameterRequired,
          parameterDefault: p.parameterDefault,
          parameterOrder: p.parameterOrder,
          parameterOptions: buildParamOptions(p),
        })),
      };

      if (isEditMode && id) {
        await updateReport(Number(id), payload);
        toast({ title: 'Success', description: 'Report updated' });
      } else {
        await createReport(payload);
        toast({ title: 'Success', description: 'Report created' });
      }
      navigate('/reports/dynamic');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to save report', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const canProceedStep1 =
    !!state.validationResult?.valid && !state.sqlDirtyAfterValidation;

  if (loading) {
    return (
      <div className="container flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/reports/dynamic')}>
              <ArrowLeft className="h-4 w-4" />
              Manage Reports
            </Button>
            <span className="text-muted-foreground">/</span>
            <ToolbarPageTitle>
              {isEditMode ? 'Edit Report' : 'New Report'}
            </ToolbarPageTitle>
          </div>
        </ToolbarHeading>
      </Toolbar>

      {/* Stepper */}
      <div className="mt-6 mb-6 flex items-center gap-2">
        {(['Step 1: SQL', 'Step 2: Parameters', 'Step 3: Metadata'] as const).map((label, idx) => {
          const stepNum = (idx + 1) as 1 | 2 | 3;
          const active = step === stepNum;
          const done = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : done
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {stepNum}
              </div>
              <span
                className={`text-sm ${active ? 'font-semibold' : 'text-muted-foreground'}`}
              >
                {label}
              </span>
              {idx < 2 && <span className="text-muted-foreground">→</span>}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-md border p-6">
        {step === 1 && (
          <Step1SqlEditor
            sql={state.sql}
            onSqlChange={handleSqlChange}
            onValidated={handleValidated}
            validationResult={state.validationResult}
            sqlDirtyAfterValidation={state.sqlDirtyAfterValidation}
          />
        )}
        {step === 2 && (
          <Step2Parameters
            parameters={state.parameters}
            onParametersChange={(params) => setState((prev) => ({ ...prev, parameters: params }))}
          />
        )}
        {step === 3 && (
          <Step3Metadata
            reportName={state.reportName}
            reportDescription={state.reportDescription}
            reportGroup={state.reportGroup}
            reportPermission={state.reportPermission}
            reportActive={state.reportActive}
            onChange={(field, value) => setState((prev) => ({ ...prev, [field]: value }))}
            nameError={nameError}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="mt-4 flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep((s) => ((s + 1) as 1 | 2 | 3))}
            disabled={step === 1 && !canProceedStep1}
          >
            Next
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            {saving ? 'Saving...' : isEditMode ? 'Update Report' : 'Create Report'}
          </Button>
        )}
      </div>
    </div>
  );
}
