import { AppError } from '../../errors/AppError';

const FUELIX_BASE_URL = 'https://api.fuelix.ai';

export interface CopilotMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface ThreadRunResult {
  threadId: string;
  runId: string;
}

export interface CopilotFileSummary {
  fileId: string;
  filename: string;
  createdAt: string | null;
}

export type RunStatus = 'pending' | 'completed';

interface ThreadRunResponse {
  id: string;
  thread_id: string;
  status: string;
}

interface ThreadMessagesResponse {
  object: 'list';
  data: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: Array<{ type: string; text?: { value: string } }>;
  }>;
}

interface FileUploadResponse {
  id: string;
  filename?: string;
}

interface VectorStoreFilesResponse {
  object: 'list';
  data: Array<{ id: string; created_at?: number }>;
}

function getApiKey(): string {
  const key = process.env.FUELIX_API_KEY;
  if (!key) throw new AppError('Fuel iX API key is not configured', 500);
  return key;
}

function getCopilotId(): string {
  const id = process.env.FUELIX_COPILOT_ID;
  if (!id) throw new AppError('Fuel iX copilot ID is not configured', 500);
  return id;
}

function getVectorStoreId(): string {
  const id = process.env.FUELIX_VECTOR_STORE_ID;
  if (!id) throw new AppError('Fuel iX vector store ID is not configured', 500);
  return id;
}

async function fuelixFetch<T>(
  path: string,
  init: { method: string; body?: unknown; isForm?: boolean }
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getApiKey()}`,
  };

  let body: BodyInit | undefined;
  if (init.isForm) {
    body = init.body as BodyInit;
  } else if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.body);
  }

  const response = await fetch(`${FUELIX_BASE_URL}${path}`, {
    method: init.method,
    headers,
    ...(body !== undefined ? { body } : {}),
  });

  if (!response.ok) {
    const text = await response.text();
    // Log the raw upstream body for debugging, but never return it to the
    // client — Fuel iX's error responses can carry internal detail that
    // shouldn't be exposed to end users.
    console.error(`Fuel iX request failed: ${init.method} ${path} -> ${response.status} ${text}`);
    throw new AppError('Fuel iX request failed. Please try again.', 502);
  }

  if (response.status === 204) return undefined as unknown as T;
  return response.json() as Promise<T>;
}

export async function createThreadRun(question: string): Promise<ThreadRunResult> {
  const result = await fuelixFetch<ThreadRunResponse>('/v1/threads/runs', {
    method: 'POST',
    body: {
      assistant_id: getCopilotId(),
      thread: {
        messages: [{ role: 'user', content: question }],
      },
    },
  });
  return { threadId: result.thread_id, runId: result.id };
}

export async function addMessageAndRun(threadId: string, question: string): Promise<ThreadRunResult> {
  await fuelixFetch(`/v1/threads/${threadId}/messages`, {
    method: 'POST',
    body: { role: 'user', content: question },
  });
  const result = await fuelixFetch<ThreadRunResponse>(`/v1/threads/${threadId}/runs`, {
    method: 'POST',
    body: { assistant_id: getCopilotId() },
  });
  return { threadId: result.thread_id, runId: result.id };
}

const RUN_TERMINAL_FAILURE_STATUSES = new Set(['failed', 'cancelled', 'expired']);

/**
 * Checks a run's status once — does not block or loop. Callers (the /ask
 * route) call this on each poll from the frontend, so no single HTTP request
 * or Express handler is ever held open waiting for the run to finish.
 */
export async function checkRunStatus(threadId: string, runId: string): Promise<RunStatus> {
  const run = await fuelixFetch<ThreadRunResponse>(`/v1/threads/${threadId}/runs/${runId}`, {
    method: 'GET',
  });
  if (run.status === 'completed') return 'completed';
  if (RUN_TERMINAL_FAILURE_STATUSES.has(run.status)) {
    throw new AppError(`Fuel iX copilot run ended with status: ${run.status}`, 502);
  }
  return 'pending';
}

export async function getThreadMessages(threadId: string): Promise<CopilotMessage[]> {
  const result = await fuelixFetch<ThreadMessagesResponse>(
    `/v1/threads/${threadId}/messages`,
    { method: 'GET' }
  );
  return result.data.map((msg) => ({
    role: msg.role,
    text: msg.content.find((c) => c.type === 'text')?.text?.value ?? '',
  }));
}

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ fileId: string }> {
  const form = new FormData();
  form.append('purpose', 'assistants');
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);

  const result = await fuelixFetch<FileUploadResponse>('/v1/files', {
    method: 'POST',
    body: form,
    isForm: true,
  });
  return { fileId: result.id };
}

export async function attachFileToVectorStore(fileId: string): Promise<void> {
  await fuelixFetch(`/v1/vector_stores/${getVectorStoreId()}/files`, {
    method: 'POST',
    body: { file_id: fileId },
  });
}

export async function listVectorStoreFiles(): Promise<CopilotFileSummary[]> {
  const result = await fuelixFetch<VectorStoreFilesResponse>(
    `/v1/vector_stores/${getVectorStoreId()}/files`,
    { method: 'GET' }
  );

  return Promise.all(
    result.data.map(async (entry) => {
      let filename = entry.id;
      try {
        const fileMeta = await fuelixFetch<FileUploadResponse>(`/v1/files/${entry.id}`, {
          method: 'GET',
        });
        filename = fileMeta.filename ?? entry.id;
      } catch {
        // Fall back to the raw file ID if metadata lookup fails.
      }
      return {
        fileId: entry.id,
        filename,
        createdAt: entry.created_at ? new Date(entry.created_at * 1000).toISOString() : null,
      };
    })
  );
}

export async function removeFileFromVectorStore(fileId: string): Promise<void> {
  await fuelixFetch(`/v1/vector_stores/${getVectorStoreId()}/files/${fileId}`, {
    method: 'DELETE',
  });
}
