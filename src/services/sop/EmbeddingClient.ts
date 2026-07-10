import { AppError } from '../../errors/AppError';

const FUELIX_EMBEDDINGS_URL = 'https://api.fuelix.ai/v1/embeddings';

function getApiKey(): string {
  const key = process.env.FUELIX_API_KEY;
  if (!key) throw new AppError('Fuel iX API key is not configured', 500);
  return key;
}

export async function embedText(text: string): Promise<number[]> {
  const response = await fetch(FUELIX_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(`Embedding request failed: ${response.status} ${body}`, 502);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };

  const embedding = data.data[0]?.embedding;
  if (!embedding || embedding.length === 0) {
    throw new AppError('Embedding response contained no data', 502);
  }
  return embedding;
}
