import { AppError } from '../../../errors/AppError';

const MONDAY_API_URL = 'https://api.monday.com/v2';

export interface MondayGraphQLError {
  message: string;
}

interface MondayGraphQLResponse<T> {
  data?: T;
  errors?: MondayGraphQLError[];
}

export async function callMondayApi<T>(
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Monday API request failed: POST ${MONDAY_API_URL} -> ${response.status} ${text}`);
    throw new AppError('Monday API request failed. Check the connection’s API key.', 502);
  }

  const body = (await response.json()) as MondayGraphQLResponse<T>;

  if (body.errors && body.errors.length > 0) {
    const message = body.errors.map((e) => e.message).join('; ');
    console.error(`Monday API returned GraphQL errors: ${message}`);
    throw new AppError(`Monday API error: ${message}`, 502);
  }

  if (body.data === undefined) {
    throw new AppError('Monday API returned an empty response.', 502);
  }

  return body.data;
}
