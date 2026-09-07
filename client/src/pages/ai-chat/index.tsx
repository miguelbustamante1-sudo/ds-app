import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { Send, Sparkles, BookOpen, MessageSquare, Trash2 } from 'lucide-react';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiPost } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import Markdown from 'react-markdown';

type ChatMode = 'general' | 'knowledge';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

interface ChatFormValues {
  message: string;
}

interface ChatReply {
  reply: string;
}

interface SopAskResponse {
  continuationToken: string;
  pollToken: string;
  status: 'pending';
}

interface SopAnswer {
  answer: string;
  sources: string[];
}

interface SopPollResponse {
  status: 'pending' | 'completed';
  answer?: SopAnswer;
}

export function AiChatPage() {
  const { canRead } = usePermissions();
  const [mode, setMode] = useState<ChatMode>('knowledge');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [continuationToken, setContinuationToken] = useState<string | undefined>(undefined);
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

  const handleModeChange = (next: ChatMode) => {
    if (next === mode) return;
    setMode(next);
    setHistory([]);
    setContinuationToken(undefined);
    reset();
  };

  const onSubmit = async ({ message }: ChatFormValues) => {
    if (!message.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: message.trim() };
    const nextHistory: ChatMessage[] = [...history, userMessage];
    setHistory(nextHistory);
    reset();
    setLoading(true);

    try {
      if (mode === 'knowledge') {
        const started = await apiPost<SopAskResponse>('/api/sop/ask', {
          question: userMessage.content,
          continuationToken,
        });
        setContinuationToken(started.continuationToken);

        const POLL_INTERVAL_MS = 1500;
        const POLL_MAX_ATTEMPTS = 30; // ~45s ceiling before giving up

        let finalAnswer: SopAnswer | undefined;
        for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          const polled = await apiGet<SopPollResponse>(
            `/api/sop/ask/${started.pollToken}`,
          );
          if (polled.status === 'completed') {
            finalAnswer = polled.answer;
            break;
          }
        }

        if (!finalAnswer) {
          throw new Error('Timed out waiting for a response from the Knowledge Base.');
        }

        setHistory([
          ...nextHistory,
          { role: 'assistant', content: finalAnswer.answer, sources: finalAnswer.sources },
        ]);
      } else {
        const result = await apiPost<ChatReply>('/api/ai/chat', {
          message: userMessage.content,
          history,
        });
        setHistory([...nextHistory, { role: 'assistant', content: result.reply }]);
      }
    } catch {
      setHistory([
        ...nextHistory,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const emptyStateText =
    mode === 'knowledge'
      ? 'Ask me anything about your company SOPs.'
      : "Ask me about your team's time-off, upcoming vacations, holiday swaps…";

  const placeholderText =
    mode === 'knowledge'
      ? 'Ask a question about your SOPs…'
      : 'Ask about your team’s time-off, upcoming vacations, holiday swaps…';

  return (
    <div className="container flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>AI Assistant</ToolbarPageTitle>
          <ToolbarDescription>
            {mode === 'knowledge'
              ? 'Answers grounded in your uploaded SOP documents'
              : 'Ask questions about your team and time-off data'}
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      <div className="mb-3 flex items-center gap-2">
        <Button
          variant={mode === 'general' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => handleModeChange('general')}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          General Assistant
        </Button>
        <Button
          variant={mode === 'knowledge' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => handleModeChange('knowledge')}
        >
          <BookOpen className="mr-1.5 h-3.5 w-3.5" />
          Knowledge Base
        </Button>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground"
            onClick={() => { setHistory([]); setContinuationToken(undefined); reset(); }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Clear chat
          </Button>
        )}
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          {history.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Sparkles className="h-8 w-8" />
              <p className="text-sm">{emptyStateText}</p>
            </div>
          )}

          {history.map((msg, i) => (
            <div
              key={i}
              className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}
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
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-1.5 flex max-w-[75%] flex-wrap gap-1">
                  {msg.sources.map((src) => (
                    <Badge key={src} variant="secondary" className="text-xs font-normal">
                      {src}
                    </Badge>
                  ))}
                </div>
              )}
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
          placeholder={placeholderText}
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
