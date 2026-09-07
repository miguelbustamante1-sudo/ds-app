import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router';
import { Search } from 'lucide-react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BackToHubButton } from '@/components/BackToHubButton';
import { usePermissions } from '@/hooks/usePermissions';
import { apiGet } from '@/lib/api';
import { format } from 'date-fns';
import type { MessageInsightsDTO } from '@shared/dto';

interface LookupForm {
  messageId: string;
}

export function EmailMessageInsightsPage() {
  const { canRead } = usePermissions();
  const [searchParams] = useSearchParams();
  const [insights, setInsights] = useState<MessageInsightsDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit } = useForm<LookupForm>({
    defaultValues: { messageId: searchParams.get('messageId') ?? '' },
  });

  const lookup = async (data: LookupForm) => {
    setLoading(true);
    setError(null);
    setInsights(null);
    try {
      const result = await apiGet<MessageInsightsDTO>(
        `/api/email-message-insights/${encodeURIComponent(data.messageId.trim())}`,
      );
      setInsights(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lookup failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!canRead('EmailAdmin')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Email Delivery Status</ToolbarPageTitle>
          <ToolbarDescription>
            Look up the delivery outcome of a specific email by its SES MessageId
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <BackToHubButton hubPath="/maintenance-hub" />
        </ToolbarActions>
      </Toolbar>

      <form onSubmit={handleSubmit(lookup)} className="mt-6 space-y-6 max-w-2xl">
        <Card>
          <CardContent>
            <CardTitle className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4" />
              Message Lookup
            </CardTitle>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="messageId">
                  MessageId <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="messageId"
                  placeholder="e.g. 0100019xxxxx-xxxx-xxxx-xxxx-xxxxxxxx-000000"
                  {...register('messageId', { required: true })}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Looking up…' : 'Check status'}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            <p className="text-xs text-muted-foreground mt-2">
              Requires SES Virtual Deliverability Manager to be enabled on the account —
              if it isn't, this lookup will return an error.
            </p>
          </CardContent>
        </Card>

        {insights && (
          <Card>
            <CardContent>
              <CardTitle className="mb-4">Result</CardTitle>
              <div className="space-y-1 text-sm mb-4">
                <p>
                  <span className="text-muted-foreground">MessageId:</span>{' '}
                  {insights.messageId}
                </p>
                {insights.fromEmailAddress && (
                  <p>
                    <span className="text-muted-foreground">From:</span>{' '}
                    {insights.fromEmailAddress}
                  </p>
                )}
                {insights.subject && (
                  <p>
                    <span className="text-muted-foreground">Subject:</span> {insights.subject}
                  </p>
                )}
              </div>

              {insights.insights.length === 0 && (
                <p className="text-sm text-muted-foreground">No delivery events recorded yet.</p>
              )}

              <div className="space-y-4">
                {insights.insights.map((destInsight, i) => (
                  <div key={i} className="rounded-md border px-4 py-3">
                    <p className="text-sm font-medium mb-2">
                      {destInsight.destination ?? 'Unknown destination'}
                      {destInsight.isp && (
                        <span className="text-xs text-muted-foreground"> · {destInsight.isp}</span>
                      )}
                    </p>
                    <div className="space-y-2">
                      {destInsight.events.map((event, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{event.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.timestamp), 'dd-MMM-yyyy HH:mm')}
                          </span>
                          {event.bounceType && (
                            <span className="text-xs text-muted-foreground">
                              ({event.bounceType}
                              {event.bounceSubType ? ` / ${event.bounceSubType}` : ''})
                            </span>
                          )}
                          {event.complaintSubType && (
                            <span className="text-xs text-muted-foreground">
                              ({event.complaintSubType})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
