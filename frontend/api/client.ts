const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'footyfinder_token';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiClient<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle empty responses (204 No Content)
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    // On 401, clear token (session expired)
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }
    throw new ApiError(res.status, json.error || `Request failed with status ${res.status}`);
  }

  return json as T;
}

export const api = {
  get: <T>(path: string) => apiClient<T>('GET', path),
  post: <T>(path: string, body?: unknown) => apiClient<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => apiClient<T>('PUT', path, body),
  delete: <T>(path: string) => apiClient<T>('DELETE', path),
};
