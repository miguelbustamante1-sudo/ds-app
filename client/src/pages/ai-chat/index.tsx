import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { Send, Sparkles } from 'lucide-react';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { apiPost } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import Markdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatFormValues {
  message: string;
}

interface ChatReply {
  reply: string;
}

export function AiChatPage() {
  const { canRead } = usePermissions();
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<ChatFormValues>({
    defaultValues: { message: '' },
    mode: 'onChange',
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  if (!canRead('AiChat')) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async ({ message }: ChatFormValues) => {
    if (!message.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: message.trim() };
    const nextHistory: ChatMessage[] = [...history, userMessage];
    setHistory(nextHistory);
    reset();
    setLoading(true);

    try {
      const result = await apiPost<ChatReply>('/api/ai/chat', {
        message: userMessage.content,
        history,
      });
      setHistory([...nextHistory, { role: 'assistant', content: result.reply }]);
    } catch {
      setHistory([
        ...nextHistory,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>AI Assistant</ToolbarPageTitle>
          <ToolbarDescription>
            Ask questions about your team and time-off data
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          {history.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Sparkles className="h-8 w-8" />
              <p className="text-sm">
                Ask me about your team&apos;s time-off, holiday swaps, or upcoming coverage.
              </p>
            </div>
          )}

          {history.map((msg, i) => (
            <div
              key={i}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[75%] rounded-lg px-4 py-2.5 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_strong]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_code]:bg-background [&_code]:rounded [&_code]:px-1 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic'
                )}
              >
                {msg.role === 'assistant' ? (
                  <Markdown>{msg.content}</Markdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                Thinking…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-3 flex items-end gap-2">
        <Textarea
          {...register('message', { required: true })}
          placeholder="Ask about your team's time-off, upcoming vacations, holiday swaps…"
          className="min-h-[56px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit(onSubmit)();
            }
          }}
        />
        <Button type="submit" disabled={loading || !isValid} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
