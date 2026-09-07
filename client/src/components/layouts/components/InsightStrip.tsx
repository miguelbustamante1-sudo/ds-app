import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';

interface InsightResult {
  message: string;
}

export function InsightStrip() {
  const { canRead } = usePermissions();
  const [insights, setInsights] = useState<InsightResult[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const canView = canRead('AiInsights');

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    void apiGet<InsightResult[]>('/api/ai/insights')
      .then((data) => setInsights(data.slice(0, 2)))
      .catch(() => setInsights([]))
      .finally(() => setLoading(false));
  }, [canView]);

  if (!canView || dismissed || loading || insights.length === 0) return null;

  return (
    <div className="flex items-start gap-3 border-b border-border bg-muted/50 px-6 py-2">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

      <div className="flex flex-1 flex-col gap-1">
        {insights.map((insight, i) => (
          <p key={i} className="text-sm text-foreground">
            {insight.message}
          </p>
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss insights"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
