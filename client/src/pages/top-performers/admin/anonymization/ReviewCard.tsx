import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { anonymizationApi } from '@/api/topPerformers/anonymization';
import type { TpAnonymizationReviewDTO } from '@shared/dto/TpAnonymization';

const TYPE_LABELS: Record<string, string> = { PEER: 'Par', ADMIN: 'Administrativo', CUSTOMER: 'Cliente' };

interface ReviewCardProps {
  item: TpAnonymizationReviewDTO;
  onApproved: () => void;
}

export function ReviewCard({ item, onApproved }: ReviewCardProps) {
  const { toast } = useToast();
  const [editedText, setEditedText] = useState(item.nomAnonymizedText ?? '');
  const [saving, setSaving] = useState(false);

  const isEdited = editedText !== item.nomAnonymizedText;

  async function handleApprove() {
    setSaving(true);
    try {
      await anonymizationApi.approve(item.nomId, isEdited ? editedText : undefined);
      toast({ title: 'Nominación aprobada' });
      onApproved();
    } catch {
      toast({ title: 'Error al aprobar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{TYPE_LABELS[item.nomType] ?? item.nomType}</Badge>
          <Badge variant={item.nomAnonymizationStatus === 'APPROVED' ? 'default' : item.nomAnonymizationStatus === 'NEEDS_REVIEW' ? 'destructive' : 'secondary'}>
            {item.nomAnonymizationStatus}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">TEXTO ORIGINAL (solo visible para ti)</p>
            <div className="bg-muted rounded p-3 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
              {item.nomAchievementText}
              {item.nomAdminExceedsRole && (
                <div className="mt-2 border-t pt-2 text-xs">
                  <strong>Supera expectativas:</strong> {item.nomAdminExceedsRole}
                </div>
              )}
              {item.metrics.length > 0 && (
                <div className="mt-2 border-t pt-2 text-xs">
                  <strong>Métricas:</strong>
                  <ul>{item.metrics.map((m, i) => <li key={i}>{m.nmeMetricName}: {m.nmeMetricValue}</li>)}</ul>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">TEXTO ANONIMIZADO (versión que verán los votantes)</p>
            {item.nomAnonymizedText ? (
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={10}
                className="text-sm"
              />
            ) : (
              <div className="rounded p-3 text-sm border border-amber-300 bg-amber-50 text-amber-800">
                Sin texto anonimizado — la IA no pudo procesar esta nominación. Escribe el texto manualmente abajo.
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={6}
                  className="text-sm mt-2"
                  placeholder="Escribe aquí la versión anonimizada..."
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {isEdited && <span className="text-xs text-muted-foreground self-center">Editado manualmente</span>}
          <Button onClick={handleApprove} disabled={saving || !editedText.trim()}>
            {saving ? 'Aprobando...' : 'Aprobar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
