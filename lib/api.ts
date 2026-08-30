import { API_URL } from './config';

export { API_URL };

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export async function apiPost<T>(path: string, body: unknown, timeoutMs = 20000): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs,
  });
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? 8000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const { timeoutMs: _t, ...rest } = init ?? {};
    const res = await fetch(`${API_URL}${path}`, { ...rest, signal: ctrl.signal });
    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail = typeof body?.detail === 'string' ? body.detail : JSON.stringify(body).slice(0, 180);
      } catch {
        detail = await res.text().then((t) => t.slice(0, 180));
      }
      throw new Error(`${path} → ${res.status}${detail ? ` · ${detail}` : ''}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`${path} → timed out. Is the API running at ${API_URL}?`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
