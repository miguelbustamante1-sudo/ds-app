import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getPersistenceJob, cancelPersistenceJob, type PersistenceJobRecord } from '@/services/persistenceJob';
import { format, parseISO } from 'date-fns';

/** Formats a full ISO datetime string. */
function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return format(parseISO(iso), 'MMM dd, yyyy HH:mm');
}

// --- Status badge colours (keep in sync with index.tsx) ----------------------

const STATUS_VARIANT: Record<
  string,
  'secondary' | 'destructive' | 'outline' | 'primary' | 'success' | 'warning' | 'info'
> = {
  NEW:        'outline',
  WAITING:    'warning',
  RUNNING:    'info',
  SUCCESSFUL: 'success',
  FAILED:     'destructive',
  CANCELED:   'secondary',
};

// --- Small helper: labeled field row -----------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

// --- Page component -----------------------------------------------------------

export function DataImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canRead } = usePermissions();

  const [job, setJob] = useState<PersistenceJobRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const jobId = id ? parseInt(id, 10) : NaN;

  const loadJob = async () => {
    if (isNaN(jobId) || jobId < 1) return;
    setLoading(true);
    try {
      const data = await getPersistenceJob(jobId);
      setJob(data);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load job details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (isNaN(jobId) || jobId < 1) return;
    setCanceling(true);
    try {
      await cancelPersistenceJob(jobId);
      toast({ title: 'Job canceled', description: `Import job #${jobId} has been canceled.` });
      await loadJob();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to cancel job',
        variant: 'destructive',
      });
    } finally {
      setCanceling(false);
    }
  };

  const isCancelable = job !== null && ['NEW', 'WAITING', 'RUNNING'].includes(job.status);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  if (!canRead('PersistenceTemplates')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  // --- Toolbar ----------------------------------------------------------------

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Import Job Details</ToolbarPageTitle>
          <ToolbarDescription>
            {job ? `Job #${job.id} - ${job.template?.name ?? '-'}` : 'Loading...'}
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {job?.template?.id && (
            <Button
              variant="outline"
              onClick={() => navigate(`/data-import/new?templateId=${job.template!.id}`)}
            >
              Use this template
            </Button>
          )}
          {isCancelable && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={canceling || loading}
            >
              {canceling ? 'Canceling...' : 'Cancel'}
            </Button>
          )}
          <Button variant="outline" onClick={loadJob} disabled={loading}>
            <RefreshCw size={16} className={`me-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => navigate('/data-import')}>
            <ArrowLeft size={16} className="me-1" />
            Back
          </Button>
        </ToolbarActions>
      </Toolbar>

      {/* -- Content ----------------------------------------------------------- */}

      {loading && !job ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : !job ? (
        <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
          Job not found.
        </div>
      ) : (
        <div className="mt-6 space-y-8">

          {/* -- Template ---------------------------------------------------- */}
          <section>
            <h3 className="text-base font-semibold mb-3">Template</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 rounded-lg border p-5">
              <Field label="Template ID">{job.template?.id ?? '-'}</Field>
              <Field label="Template Name">{job.template?.name ?? '-'}</Field>
            </div>
          </section>

          {/* -- Job status -------------------------------------------------- */}
          <section>
            <h3 className="text-base font-semibold mb-3">Job Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 rounded-lg border p-5">
              <Field label="Job ID">{job.id}</Field>
              <Field label="Status">
                <Badge variant={STATUS_VARIANT[job.status] ?? 'outline'}>
                  {job.status}
                </Badge>
              </Field>
              <Field label="Created By">{job.createdBy ?? '-'}</Field>
              <Field label="Created At">{formatDateTime(job.createdAt)}</Field>
              <Field label="Updated By">{job.updatedBy ?? '-'}</Field>
              <Field label="Updated At">{formatDateTime(job.updatedAt)}</Field>
            </div>
          </section>

          {/* -- Input ------------------------------------------------------- */}
          <section>
            <h3 className="text-base font-semibold mb-3">Input</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 rounded-lg border p-5">
              <Field label="File Name">{job.fileInputName ?? '-'}</Field>
              <Field label="Total Lines">{(job.fileLinesCount ?? 0).toLocaleString()}</Field>
            </div>
          </section>

          {/* -- Output ------------------------------------------------------ */}
          <section>
            <h3 className="text-base font-semibold mb-3">Output</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 rounded-lg border p-5">
              <Field label="Rows Inserted">
                {(job.fileLinesInserted ?? 0).toLocaleString()} / {(job.fileLinesCount ?? 0).toLocaleString()}
              </Field>
              <Field label="Error Line">
                {job.fileErrorLine && job.fileErrorLine > 0 ? job.fileErrorLine : '-'}
              </Field>
              <Field label="Error Message">
                {job.fileErrorMessage ? (
                  <span className="text-destructive break-all">{job.fileErrorMessage}</span>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </Field>
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
