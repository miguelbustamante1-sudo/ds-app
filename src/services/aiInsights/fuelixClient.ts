import { AppError } from '../../errors/AppError';

const FUELIX_URL = 'https://api.fuelix.ai/v1/chat/completions';

export interface FuelixMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: FuelixToolCall[];
  name?: string;
}

export interface FuelixToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface FuelixToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface FuelixResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: FuelixToolCall[];
    };
    finish_reason: string;
  }>;
}

export interface FuelixRequest {
  model: string;
  messages: FuelixMessage[];
  tools?: FuelixToolDefinition[];
  tool_choice?: 'auto' | 'none';
  temperature?: number;
  max_tokens?: number;
}

function getApiKey(): string {
  const key = process.env.FUELIX_API_KEY;
  if (!key) throw new AppError('Fuel iX API key is not configured', 500);
  return key;
}

export async function callFuelIx(request: FuelixRequest): Promise<FuelixResponse> {
  const response = await fetch(FUELIX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    // Log the raw upstream body for debugging, but never return it to the
    // client — Fuel iX's error responses can carry internal detail that
    // shouldn't be exposed to end users.
    console.error(`Fuel iX request failed: POST ${FUELIX_URL} -> ${response.status} ${text}`);
    throw new AppError('Fuel iX request failed. Please try again.', 502);
  }

  return response.json() as Promise<FuelixResponse>;
}
