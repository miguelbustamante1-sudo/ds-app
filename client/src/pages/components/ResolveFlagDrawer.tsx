import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiPatch, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { ResolveStandaloneTaskDTO, StandaloneTaskDTO, SupervisorFlagDTO } from '@shared/dto';

interface ResolveFlagDrawerProps {
  flag: SupervisorFlagDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved: () => void;
}

interface ResolveFlagFormData {
  comment: string;
}

const WAIVER_FORM_BASE_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdciu68xhRmpjUk6T9l1wAoVlRsc63k5eQgppw-pS9KU1JDXg/viewform';

function buildWaiverFormUrl(flag: SupervisorFlagDTO): string {
  const tlOm = flag.tlOmName ?? '';
  const field1 = `${flag.workdayId}-${flag.teamMember}-${tlOm}-${flag.issue}`;
  const field2 =
    `This error is related to ${flag.category} and is currently at ${flag.weeksOpen} Weeks ` +
    `at the date of submission, the category is ${flag.category}; error is assigned to ` +
    `TL/OM: ${tlOm} as of right now.`;

  const params = new URLSearchParams({
    usp: 'pp_url',
    'entry.1023107719': field1,
    'entry.1892810221': field2,
  });
  return `${WAIVER_FORM_BASE_URL}?${params.toString()}`;
}

export function ResolveFlagDrawer({ flag, open, onOpenChange, onResolved }: ResolveFlagDrawerProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState<'RESOLVE' | 'REJECT' | null>(null);

  const { register, watch, reset } = useForm<ResolveFlagFormData>({
    defaultValues: { comment: '' },
  });

  const watchedComment = watch('comment');

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset({ comment: '' });
    onOpenChange(nextOpen);
  };

  const resolve = async (
    kind: 'RESOLVE' | 'REJECT',
    payload: ResolveStandaloneTaskDTO,
  ) => {
    if (!flag) return;
    setSubmitting(kind);
    try {
      await apiPatch<StandaloneTaskDTO, ResolveStandaloneTaskDTO>(
        `/api/standalone-tasks/${flag.id}/resolve`,
        payload,
      );
      toast({ title: kind === 'REJECT' ? 'Flag rejected' : 'Flag resolved' });
      onResolved();
      handleOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError || err instanceof Error ? err.message : 'Failed to resolve flag';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(null);
    }
  };

  const handleResolved = () => {
    const comment = watchedComment?.trim();
    void resolve('RESOLVE', { status: 'APPROVED', comment: comment || null });
  };

  const handleReject = () => {
    const comment = watchedComment?.trim();
    if (!comment) {
      toast({
        title: 'Comment required',
        description: 'Please enter a comment before rejecting.',
        variant: 'destructive',
      });
      return;
    }
    void resolve('REJECT', { status: 'REJECTED', comment });
  };

  const handleWaiver = () => {
    if (!flag || !flag.tlOmName) return;
    window.open(buildWaiverFormUrl(flag), '_blank', 'noopener,noreferrer');
    toast({
      title: 'Waiver form opened',
      description: 'Fill it out in the new tab. This does not resolve the flag.',
    });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Resolve Flag</SheetTitle>
        </SheetHeader>

        {flag && (
          <div className="mt-4 space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {flag.category}
              </p>
              <h3 className="font-semibold text-base">{flag.teamMember}</h3>
              <p className="text-sm text-muted-foreground">{flag.issue}</p>
              <p className="text-xs text-muted-foreground">
                Open {flag.weeksOpen} week{flag.weeksOpen === 1 ? '' : 's'}
              </p>
            </div>

            {flag.detail && flag.detail.length > 0 && (
              <dl className="space-y-1">
                {flag.detail.map((item) => (
                  <div key={item.label} className="text-xs">
                    <dt className="inline font-semibold text-foreground">{item.label}:</dt>{' '}
                    <dd className="inline text-muted-foreground">{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Resolution comment</Label>
              <p className="text-xs text-muted-foreground">
                Optional for Resolved, required for Reject. Not used by Waiver.
              </p>
              <Textarea {...register('comment')} placeholder="Add a comment..." rows={3} />
            </div>

            <SheetFooter className="flex gap-2 justify-end">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={submitting !== null}
              >
                {submitting === 'REJECT' ? 'Saving...' : 'Reject'}
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={handleWaiver}
                      disabled={submitting !== null || !flag.tlOmName}
                    >
                      Waiver
                    </Button>
                  </TooltipTrigger>
                  {!flag.tlOmName && (
                    <TooltipContent>Can&apos;t determine TL/OM for this team member</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="primary"
                onClick={handleResolved}
                disabled={submitting !== null}
              >
                {submitting === 'RESOLVE' ? 'Saving...' : 'Resolved'}
              </Button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
