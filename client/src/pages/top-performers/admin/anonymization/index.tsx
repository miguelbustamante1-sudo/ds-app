import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ReviewCard } from './ReviewCard';
import { anonymizationApi } from '@/api/topPerformers/anonymization';
import { cyclesApi } from '@/api/topPerformers/cycles';

export default function AnonymizationReviewPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: activeCycle } = useQuery({ queryKey: ['tp-active-cycle'], queryFn: cyclesApi.getActive });

  const cycId = activeCycle?.cycId;
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['tp-anonymization', cycId],
    queryFn: () => anonymizationApi.getForCycle(cycId!),
    enabled: !!cycId,
  });

  const pending = items.filter((i) => i.nomAnonymizationStatus !== 'APPROVED');
  const approved = items.filter((i) => i.nomAnonymizationStatus === 'APPROVED');

  async function triggerBatch() {
    if (!cycId) return;
    try {
      const result = await anonymizationApi.triggerBatch(cycId);
      toast({ title: `Processed: ${result.processed} · Failed: ${result.failed}` });
      void queryClient.invalidateQueries({ queryKey: ['tp-anonymization', cycId] });
    } catch {
      toast({ title: 'Error processing batch', variant: 'destructive' });
    }
  }

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['tp-anonymization', cycId] });

  if (!activeCycle) return <div className="p-6 text-muted-foreground">No active cycle.</div>;

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Anonymization Review — {activeCycle.cycName}</CardTitle>
            <Button onClick={triggerBatch} disabled={isLoading}>Process with AI</Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {pending.length} pending review · {approved.length} approved
          </p>

          {isLoading && <p className="text-muted-foreground">Loading...</p>}

          {pending.map((item) => (
            <ReviewCard key={item.nomId} item={item} onApproved={refresh} />
          ))}

          {pending.length === 0 && !isLoading && (
            <p className="text-green-600 font-medium">All nominations are approved.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
