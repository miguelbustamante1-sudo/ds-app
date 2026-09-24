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
 * Dispatches a custom event on 401 for session expiration handling and on
 * 403 for access-denied handling (see AuthProvider)
 */
async function handleResponse<T>(response: Response, endpoint: string, unwrap = true): Promise<T> {
  if (!response.ok) {
    // Handle 401 Unauthorized - session may have expired
    if (response.status === 401) {
      // Dispatch event for auth provider to handle
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { endpoint } }));
    }

    // Handle 403 Forbidden - authenticated but not authorized for this
    // resource. AuthProvider listens for this to show a toast and redirect
    // to the dashboard, so no page has to handle this itself.
    if (response.status === 403) {
      window.dispatchEvent(new CustomEvent('auth:forbidden', { detail: { endpoint } }));
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

  const json = await response.json();
  // Unwrap { data: T } envelope from new-style routes; pass raw response from legacy routes unchanged
  if (unwrap && json !== null && typeof json === 'object' && !Array.isArray(json) && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

/**
 * GET request
 */
export async function apiGet<TResponse>(endpoint: string, unwrap = true): Promise<TResponse> {
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include',
  });

  return handleResponse<TResponse>(response, endpoint, unwrap);
}

/**
 * POST request with typed body
 */
export async function apiPost<TResponse, TBody = unknown>(
  endpoint: string,
  data: TBody,
  unwrap = true
): Promise<TResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });

  return handleResponse<TResponse>(response, endpoint, unwrap);
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
 * DELETE request — body is optional (used for bulk operations)
 */
export async function apiDelete<TBody = unknown>(endpoint: string, data?: TBody): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include',
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });

  return handleResponse<void>(response, endpoint);
}
