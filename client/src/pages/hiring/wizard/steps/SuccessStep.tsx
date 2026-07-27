import { useNavigate } from 'react-router';
import { CheckCircle } from 'lucide-react';
import type { EndorsementWithDetailsDTO, HiringDTO } from '@shared/dto';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatUTCDate } from '@/lib/utils';

interface SuccessStepProps {
  endorsement: EndorsementWithDetailsDTO;
  hiring: HiringDTO;
}

export function SuccessStep({ endorsement, hiring }: SuccessStepProps) {
  const navigate = useNavigate();

  const rate =
    endorsement.billingRate != null
      ? `${hiring.currencySymbol ?? endorsement.billingRateCurrency ?? ''} ${endorsement.billingRate}`.trim()
      : '—';

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle size={20} className="text-primary" />
          <Badge variant="success">Hired</Badge>
        </div>

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
            <dt className="text-muted-foreground">Start Date</dt>
            <dd>{hiring.startDate ? formatUTCDate(hiring.startDate) : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Billable Date</dt>
            <dd>{hiring.billableDate ? formatUTCDate(hiring.billableDate) : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Workday ID</dt>
            <dd>{hiring.workdayId ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Billing Rate</dt>
            <dd>{rate}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Supervisor</dt>
            <dd>
              {hiring.teamLead
                ? `${hiring.teamLead.teamMemberNames} ${hiring.teamLead.teamMemberSurnames} (assigned)`
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex justify-end gap-3">
        <Button onClick={() => navigate('/hiring')}>Back to Hiring</Button>
      </div>
    </div>
  );
}
