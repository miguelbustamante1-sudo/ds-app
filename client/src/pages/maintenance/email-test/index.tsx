import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Send } from 'lucide-react';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiPost } from '@/lib/api';
import { Link } from 'react-router';

interface EmailTestForm {
  to: string;
  subject: string;
  body: string;
  replyTo: string;
}

interface SendResult {
  preset: string;
  isHtml: boolean;
  status: 'idle' | 'sending' | 'ok' | 'error';
  error?: string;
  messageId?: string | null;
}

interface Preset {
  label: string;
  isHtml: boolean;
  subjectSuffix: string;
  buildBody: (subject: string) => string;
}

const PRESETS: Preset[] = [
  {
    label: 'Plain text',
    isHtml: false,
    subjectSuffix: '(plain)',
    buildBody: (subject) =>
      `This is a plain-text test email.\n\nSubject: ${subject}\nSent at: ${new Date().toISOString()}\n\nNo HTML — just raw text.`,
  },
  {
    label: 'HTML basic',
    isHtml: true,
    subjectSuffix: '(html-basic)',
    buildBody: (subject) =>
      `<p>This is a <strong>basic HTML</strong> test email.</p><p>Subject: ${subject}</p><p>Sent at: ${new Date().toISOString()}</p>`,
  },
  {
    label: 'HTML styled',
    isHtml: true,
    subjectSuffix: '(html-styled)',
    buildBody: (subject) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
    <h1 style="color:#4f46e5;margin-top:0;">SES Test — Styled</h1>
    <p>Subject: <strong>${subject}</strong></p>
    <p>Sent at: <code>${new Date().toISOString()}</code></p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="color:#6b7280;font-size:12px;">This is a styled HTML email sent from the DS App email test page.</p>
  </div>
</body>
</html>`,
  },
  {
    label: 'HTML with reply-to',
    isHtml: true,
    subjectSuffix: '(html-replyto)',
    buildBody: (subject) =>
      `<p>This email has a <strong>Reply-To</strong> header set.</p><p>Subject: ${subject}</p>`,
  },
  {
    label: 'Multi-recipient',
    isHtml: false,
    subjectSuffix: '(multi)',
    buildBody: (subject) =>
      `Plain-text email sent to multiple recipients.\n\nSubject: ${subject}\nSent at: ${new Date().toISOString()}`,
  },
];

export function EmailTestPage() {
  const { toast } = useToast();
  const { canRead } = usePermissions();
  const [results, setResults] = useState<SendResult[]>(
    PRESETS.map((p) => ({ preset: p.label, isHtml: p.isHtml, status: 'idle' })),
  );
  const [sending, setSending] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<EmailTestForm>({
    defaultValues: {
      to: '',
      subject: 'SES Email Test',
      body: '',
      replyTo: '',
    },
  });

  const toValue = watch('to');
  const subjectValue = watch('subject');
  const replyToValue = watch('replyTo');

  const runPreset = async (index: number) => {
    const preset = PRESETS[index];

    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, status: 'sending' } : r)),
    );

    try {
      const fullSubject = `${subjectValue} ${preset.subjectSuffix}`;
      const body = preset.buildBody(fullSubject);

      // Multi-recipient: split comma-separated addresses
      const to =
        preset.label === 'Multi-recipient'
          ? toValue.split(',').map((s) => s.trim()).filter(Boolean)
          : toValue.trim();

      const result = await apiPost<{ sent: boolean; messageId: string | null }>(
        '/api/email-test/send',
        {
          to,
          subject: fullSubject,
          body,
          isHtml: preset.isHtml,
          ...(replyToValue.trim() ? { replyTo: replyToValue.trim() } : {}),
        },
      );

      setResults((prev) =>
        prev.map((r, i) =>
          i === index ? { ...r, status: 'ok', messageId: result.messageId } : r,
        ),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Send failed';
      setResults((prev) =>
        prev.map((r, i) => (i === index ? { ...r, status: 'error', error: message } : r)),
      );
    }
  };

  const runAll = async () => {
    setSending(true);
    for (let i = 0; i < PRESETS.length; i++) {
      await runPreset(i);
    }
    setSending(false);
    toast({ title: 'Done', description: 'All test emails attempted.' });
  };

  const onSubmit = () => runAll();

  if (!canRead('EmailAdmin')) {
    return (
      <div className="container flex items-center justify-center rounded-lg border border-dashed p-12 mt-6 text-muted-foreground">
        You don't have permission to view this page.
      </div>
    );
  }

  const statusBadge = (r: SendResult) => {
    if (r.status === 'idle') return <Badge variant="secondary">Idle</Badge>;
    if (r.status === 'sending') return <Badge variant="outline">Sending…</Badge>;
    if (r.status === 'ok') return <Badge variant="success">Sent</Badge>;
    return <Badge variant="destructive">Error</Badge>;
  };

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Email Test</ToolbarPageTitle>
          <ToolbarDescription>
            Send test emails via SES in all supported configurations
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6 max-w-2xl">
        <Card>
          <CardContent>
            <CardTitle className="flex items-center gap-2 mb-4">
              <Mail className="h-4 w-4" />
              Sender Configuration
            </CardTitle>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="to">
                  To <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="to"
                  placeholder="recipient@example.com (comma-separate for multi-recipient test)"
                  {...register('to', { required: 'Recipient address is required' })}
                />
                {errors.to && (
                  <p className="text-sm text-destructive">{errors.to.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject">
                  Subject base <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="subject"
                  placeholder="SES Email Test"
                  {...register('subject', { required: 'Subject is required' })}
                />
                {errors.subject && (
                  <p className="text-sm text-destructive">{errors.subject.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Each test variant appends a suffix like "(plain)" or "(html-styled)".
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="replyTo">Reply-To (optional)</Label>
                <Input
                  id="replyTo"
                  placeholder="replyto@example.com"
                  {...register('replyTo')}
                />
                <p className="text-xs text-muted-foreground">
                  Used only in the "HTML with reply-to" variant.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <CardTitle className="flex items-center gap-2 mb-4">
              <Send className="h-4 w-4" />
              Test Variants
            </CardTitle>

            <div className="space-y-3">
              {PRESETS.map((preset, i) => {
                const result = results[i];
                return (
                  <div
                    key={preset.label}
                    className="flex items-center justify-between rounded-md border px-4 py-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{preset.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {preset.isHtml ? 'Content-Type: text/html' : 'Content-Type: text/plain'}
                        {preset.label === 'Multi-recipient' && ' · splits comma-separated addresses'}
                        {preset.label === 'HTML with reply-to' && ' · sets Reply-To header'}
                      </p>
                      {result.status === 'error' && (
                        <p className="text-xs text-destructive">{result.error}</p>
                      )}
                      {result.status === 'ok' && result.messageId && (
                        <p className="text-xs text-muted-foreground">
                          MessageId: {result.messageId}{' '}
                          <Link
                            to={`/maintenance/email-message-insights?messageId=${encodeURIComponent(result.messageId)}`}
                            className="underline"
                          >
                            Check delivery status
                          </Link>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {statusBadge(result)}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={sending || result.status === 'sending'}
                        onClick={() => runPreset(i)}
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="submit" disabled={sending}>
                {sending ? 'Sending all…' : 'Send All'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
