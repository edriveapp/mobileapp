const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', token, body } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'message' in data
        ? Array.isArray((data as any).message)
          ? (data as any).message.join(', ')
          : String((data as any).message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export { API_BASE_URL };
