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
      toast({ title: `Procesadas: ${result.processed} · Fallidas: ${result.failed}` });
      void queryClient.invalidateQueries({ queryKey: ['tp-anonymization', cycId] });
    } catch {
      toast({ title: 'Error al procesar el lote', variant: 'destructive' });
    }
  }

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['tp-anonymization', cycId] });

  if (!activeCycle) return <div className="p-6 text-muted-foreground">No hay un ciclo activo.</div>;

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Revisión de Anonimización — {activeCycle.cycName}</CardTitle>
            <Button onClick={triggerBatch} disabled={isLoading}>Procesar con IA</Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {pending.length} pendiente(s) de revisión · {approved.length} aprobada(s)
          </p>

          {isLoading && <p className="text-muted-foreground">Cargando...</p>}

          {pending.map((item) => (
            <ReviewCard key={item.nomId} item={item} onApproved={refresh} />
          ))}

          {pending.length === 0 && !isLoading && (
            <p className="text-green-600 font-medium">Todas las nominaciones están aprobadas.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
