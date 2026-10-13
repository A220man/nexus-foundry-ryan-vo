/** Typed API client for backend communication. */
import type {
  CompositionCreate,
  CompositionUpdate,
  CompositionResponse,
  CompositionListResponse,
  ValidationResponse,
  RenderJobCreate,
  RenderJobResponse,
  TemplateCreate,
  TemplateResponse,
} from '../types/api';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(response.status, error.detail || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail));
    this.name = 'ApiError';
  }
}

/** Compositions API */
export const compositionsApi = {
  list: (params?: { page?: number; page_size?: number; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.page_size) searchParams.set('page_size', String(params.page_size));
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return fetchJson<CompositionListResponse>(`/compositions${query ? `?${query}` : ''}`);
  },

  get: (id: string) => fetchJson<CompositionResponse>(`/compositions/${id}`),

  create: (data: CompositionCreate) =>
    fetchJson<CompositionResponse>('/compositions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: CompositionUpdate) =>
    fetchJson<CompositionResponse>(`/compositions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchJson<void>(`/compositions/${id}`, { method: 'DELETE' }),

  validate: (html_content: string) =>
    fetchJson<ValidationResponse>('/compositions/validate', {
      method: 'POST',
      body: JSON.stringify({ html_content }),
    }),
};

/** Render Jobs API */
export const rendersApi = {
  create: (compositionId: string, data: RenderJobCreate) =>
    fetchJson<RenderJobResponse>(`/compositions/${compositionId}/render`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (compositionId: string) =>
    fetchJson<RenderJobResponse[]>(`/compositions/${compositionId}/renders`),

  get: (renderId: string) =>
    fetchJson<RenderJobResponse>(`/compositions/renders/${renderId}`),
};

/** Templates API */
export const templatesApi = {
  list: (category?: string) => {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return fetchJson<TemplateResponse[]>(`/compositions/templates${query}`);
  },

  get: (id: string) => fetchJson<TemplateResponse>(`/compositions/templates/${id}`),

  create: (data: TemplateCreate) =>
    fetchJson<TemplateResponse>('/compositions/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};