export interface ApiErrorDetails {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: unknown;

  constructor(status: number, error: ApiErrorDetails) {
    super(error.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = error.code;
    this.details = error.details;
  }
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface HealthCheckData {
  status: string;
  database: string;
  latency_ms: number;
  uptime: number;
  timestamp: string;
  version: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

let authToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('founders_den_token', token);
    } else {
      localStorage.removeItem('founders_den_token');
    }
  }
};

export const getAuthToken = (): string | null => {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('founders_den_token');
  }
  return null;
};

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    if (body && body.error) {
      throw new ApiError(response.status, body.error);
    }
    throw new ApiError(response.status, {
      code: 'HTTP_ERROR',
      message: response.statusText || `Request failed with status ${response.status}`,
    });
  }

  return body as ApiResponse<T>;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),

  checkHealth: async (): Promise<HealthCheckData | null> => {
    try {
      const res = await request<HealthCheckData>('/health');
      return res.data;
    } catch (err) {
      console.warn('Backend /health check failed:', err);
      return null;
    }
  },
};
