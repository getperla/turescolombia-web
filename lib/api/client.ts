import { STORAGE_KEYS } from '../../constants/storageKeys';
import type { ApiResponse, RequestConfig } from '../../types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Cache global del estado demo — evita leer localStorage en cada request
let cachedDemoMode: boolean | null = null;

export function invalidateDemoModeCache() {
  cachedDemoMode = null;
}

function isDemoModeFast(): boolean {
  if (cachedDemoMode !== null) return cachedDemoMode;
  if (typeof window === 'undefined') return false;
  cachedDemoMode = localStorage.getItem(STORAGE_KEYS.TOKEN) === 'beta-demo-token';
  return cachedDemoMode;
}

export class ApiError extends Error {
  response?: { data: any; status: number };
  constructor(message: string, response?: { data: any; status: number }) {
    super(message);
    this.name = 'ApiError';
    this.response = response;
  }
}

export function buildUrl(path: string, params?: RequestConfig['params']): string {
  const base = path.startsWith('http') ? path : `${API_BASE}${path}`;
  if (!params) return base;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.append(k, String(v));
  }
  const q = qs.toString();
  return q ? `${base}${base.includes('?') ? '&' : '?'}${q}` : base;
}

async function request<T = any>(
  method: string,
  path: string,
  body?: any,
  config?: RequestConfig,
): Promise<ApiResponse<T>> {
  // Demo mode: carga dinamica de mockData SOLO si estamos en demo.
  // Evita que mockData.ts (29KB) se bundle en todas las paginas.
  if (isDemoModeFast()) {
    const { getMockResponse } = await import('../mockData');
    const url = buildUrl(path, config?.params);
    await new Promise((r) => setTimeout(r, 120));
    return { data: getMockResponse(method.toLowerCase(), url) as T, status: 200 };
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, config?.params), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    throw new ApiError(
      (data && data.message) || res.statusText || `HTTP ${res.status}`,
      { data, status: res.status },
    );
  }
  return { data: data as T, status: res.status };
}

const api = {
  get: <T = any>(path: string, config?: RequestConfig) => request<T>('GET', path, undefined, config),
  post: <T = any>(path: string, body?: any, config?: RequestConfig) => request<T>('POST', path, body, config),
  put: <T = any>(path: string, body?: any, config?: RequestConfig) => request<T>('PUT', path, body, config),
  delete: <T = any>(path: string, config?: RequestConfig) => request<T>('DELETE', path, undefined, config),
};

export default api;
