import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle, XCircle } from 'lucide-react';
import type { EndorsementWithDetailsDTO, UpdateEndorsementStatusDTO } from '@shared/dto';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiPatch, ApiError } from '@/lib/api';

interface ApprovalStepProps {
  endorsement: EndorsementWithDetailsDTO;
  /** Called after a successful approve/reject so the wizard state machine can re-evaluate and advance. */
  onStatusChange: () => void;
}

type DialogMode = 'approve' | 'reject' | null;

export function ApprovalStep({ endorsement, onStatusChange }: ApprovalStepProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canCreate } = usePermissions();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  // Mirrors the backend gate on PATCH /endorsements/:id/status (requirePermission('Endorsements', 'create')).
  const canApprove = canCreate('Endorsements');

  function closeDialog() {
    setDialogMode(null);
    setComment('');
  }

  async function handleConfirm() {
    if (!dialogMode) return;
    const status = dialogMode === 'approve' ? 'Approved' : 'Rejected';
    try {
      setSaving(true);
      await apiPatch<void, UpdateEndorsementStatusDTO>(
        `/api/endorsements/${endorsement.endorsementId}/status`,
        { status, comment },
      );
      toast({
        title: status === 'Approved' ? 'Approved' : 'Rejected',
        description:
          status === 'Approved' ? 'The endorsement has been approved.' : 'The endorsement has been rejected.',
      });
      closeDialog();
      onStatusChange();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update the endorsement status';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  // ── S2: Rejected — terminal, read-only ──────────────────────────────────────
  if (endorsement.status === 'Rejected') {
    return (
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <Badge variant="destructive">Rejected</Badge>
        <div className="space-y-2">
          <Label>Rejection Reason</Label>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {endorsement.comment || 'No comment was recorded.'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/endorsements/${endorsement.endorsementId}`)}>
          View Endorsement
        </Button>
      </div>
    );
  }

  // ── S1: Pending ───────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <Badge variant="warning">Pending Approval</Badge>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Candidate</dt>
          <dd>
            {endorsement.candidateFirstName} {endorsement.candidateLastName}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Project</dt>
          <dd>{endorsement.project?.projectName ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Position</dt>
          <dd>{endorsement.position?.posName ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Country</dt>
          <dd>{endorsement.country?.countryName ?? '—'}</dd>
        </div>
      </dl>

      {canApprove ? (
        <div className="flex gap-3">
          <Button onClick={() => setDialogMode('approve')}>
            <CheckCircle size={16} className="me-1" />
            Approve
          </Button>
          <Button variant="outline" onClick={() => setDialogMode('reject')}>
            <XCircle size={16} className="me-1" />
            Reject
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          This request is pending approval. An Operations Manager must review it.
        </p>
      )}

      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'approve' ? 'Approve Endorsement' : 'Reject Endorsement'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Label htmlFor="statusComment">
              {dialogMode === 'approve' ? 'Approval Comment' : 'Rejection Reason'}
            </Label>
            <Textarea
              id="statusComment"
              className="mt-2"
              rows={4}
              placeholder={
                dialogMode === 'approve' ? 'Enter an approval comment...' : 'Enter the rejection reason...'
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={saving || !comment.trim()}>
              {saving ? 'Saving...' : dialogMode === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
