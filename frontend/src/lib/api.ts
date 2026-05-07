const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/** Base URL without the /api suffix — used for Sanctum CSRF cookie, etc. */
export const BASE_URL = API_URL.replace(/\/api\/v1$/, '').replace(/\/api$/, '');

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
};

const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const cookies = document.cookie
    .split('; ')
    .filter((item) => item.startsWith(`${name}=`));

  if (cookies.length === 0) {
    return undefined;
  }

  const cookie = cookies[cookies.length - 1];

  return decodeURIComponent(cookie.slice(name.length + 1));
}

async function fetchApi<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, cache, next } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const requestHeaders: Record<string, string> = isFormData
    ? {
        Accept: 'application/json',
        ...headers,
      }
    : {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      };

  const xsrfToken = CSRF_METHODS.has(method.toUpperCase()) ? getCookie('XSRF-TOKEN') : undefined;

  if (xsrfToken) {
    requestHeaders['X-XSRF-TOKEN'] = xsrfToken;
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include',
    cache,
    next,
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.message || 'Error del servidor', error.errors);
  }

  return response.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Fetch the Sanctum CSRF cookie (hits base URL, not /api). */
export async function fetchCsrfCookie(): Promise<void> {
  const response = await fetch(`${BASE_URL}/sanctum/csrf-cookie`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiError(response.status, 'No se pudo preparar la sesion.');
  }
}

export const api = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    fetchApi<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    fetchApi<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    fetchApi<T>(endpoint, { ...options, method: 'PUT', body }),
  patch: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    fetchApi<T>(endpoint, { ...options, method: 'PATCH', body }),
  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    fetchApi<T>(endpoint, { ...options, method: 'DELETE' }),
};
