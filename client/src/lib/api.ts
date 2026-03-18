/**
 * API utility functions for making authenticated requests
 * Authentication is handled via httpOnly cookies (credentials: 'include')
 */

/**
 * Custom API Error class with additional context
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get headers for API requests
 * Note: Authentication is handled via httpOnly cookies, not headers
 */
const getHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
});

/**
 * Handle API response and extract error message if needed
 * Dispatches a custom event on 401 for session expiration handling
 */
async function handleResponse<T>(response: Response, endpoint: string): Promise<T> {
  if (!response.ok) {
    // Handle 401 Unauthorized - session may have expired
    if (response.status === 401) {
      // Dispatch event for auth provider to handle
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { endpoint } }));
    }

    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    const detailMessages = Array.isArray(errorData.details) && errorData.details.length > 0
      ? (errorData.details as Array<{ message?: string }>)
          .map((d) => d.message)
          .filter(Boolean)
          .join(' ')
      : null;
    throw new ApiError(
      detailMessages || errorData.error || `HTTP ${response.status}`,
      response.status,
      endpoint
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * GET request
 */
export async function apiGet<TResponse>(endpoint: string): Promise<TResponse> {
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include',
  });

  return handleResponse<TResponse>(response, endpoint);
}

/**
 * POST request with typed body
 */
export async function apiPost<TResponse, TBody = unknown>(
  endpoint: string,
  data: TBody
): Promise<TResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });

  return handleResponse<TResponse>(response, endpoint);
}

/**
 * PUT request with typed body
 */
export async function apiPut<TResponse, TBody = unknown>(
  endpoint: string,
  data: TBody
): Promise<TResponse> {
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });

  return handleResponse<TResponse>(response, endpoint);
}

/**
 * PATCH request with typed body
 */
export async function apiPatch<TResponse, TBody = unknown>(
  endpoint: string,
  data: TBody
): Promise<TResponse> {
  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });

  return handleResponse<TResponse>(response, endpoint);
}

/**
 * DELETE request
 */
export async function apiDelete(endpoint: string): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include',
  });

  return handleResponse<void>(response, endpoint);
}
