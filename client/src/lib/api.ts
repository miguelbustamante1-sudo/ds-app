/**
 * API utility functions for making authenticated requests
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
 * Get authentication headers for API requests
 */
export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Handle API response and extract error message if needed
 */
async function handleResponse<T>(response: Response, endpoint: string): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(
      errorData.error || `HTTP ${response.status}`,
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
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  return handleResponse<void>(response, endpoint);
}
