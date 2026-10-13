/** Tests for API client. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compositionsApi, rendersApi, templatesApi, ApiError } from './client';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('ApiError', () => {
  it('creates error with status and detail', () => {
    const error = new ApiError(404, 'Not found');
    expect(error.status).toBe(404);
    expect(error.detail).toBe('Not found');
    expect(error.message).toBe('Not found');
  });

  it('handles object detail', () => {
    const detail = { errors: ['err1'], warnings: ['warn1'] };
    const error = new ApiError(400, detail);
    expect(error.detail).toEqual(detail);
    expect(error.message).toBe(JSON.stringify(detail));
  });
});

describe('compositionsApi', () => {
  it('list calls correct endpoint with params', async () => {
    const mockData = { items: [], total: 0, page: 1, page_size: 20 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await compositionsApi.list({ page: 1, page_size: 10, search: 'test' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/compositions?page=1&page_size=10&search=test',
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) })
    );
    expect(result).toEqual(mockData);
  });

  it('get calls correct endpoint', async () => {
    const mockData = { id: '123', name: 'Test', html_content: '<div></div>', width: 1920, height: 1080, fps: 30, duration: 10, meta: {}, created_at: '', updated_at: '' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await compositionsApi.get('123');

    expect(mockFetch).toHaveBeenCalledWith('/api/compositions/123', expect.any(Object));
    expect(result).toEqual(mockData);
  });

  it('create posts to correct endpoint', async () => {
    const mockData = { id: 'new-id', name: 'New', html_content: '<div></div>', width: 1920, height: 1080, fps: 30, duration: 10, meta: {}, created_at: '', updated_at: '' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await compositionsApi.create({ name: 'New', html_content: '<div></div>', width: 1920, height: 1080, fps: 30, duration: 10, meta: {} });

    expect(mockFetch).toHaveBeenCalledWith('/api/compositions', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'New', html_content: '<div></div>', width: 1920, height: 1080, fps: 30, duration: 10, meta: {} }),
    }));
    expect(result).toEqual(mockData);
  });

  it('validate calls correct endpoint', async () => {
    const mockData = { valid: true, errors: [], warnings: [] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await compositionsApi.validate('<div data-composition-id="test"></div>');

    expect(mockFetch).toHaveBeenCalledWith('/api/compositions/validate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ html_content: '<div data-composition-id="test"></div>' }),
    }));
    expect(result).toEqual(mockData);
  });

  it('throws ApiError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: 'Not found' }),
    });

    const promise = compositionsApi.get('invalid');
    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 404 });
  });
});

describe('rendersApi', () => {
  it('create calls correct endpoint', async () => {
    const mockData = { id: 'render-1', composition_id: 'comp-1', status: 'pending', format: 'mp4', quality: 'high', progress: 0, total_frames: 0, completed_frames: 0, created_at: '' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await rendersApi.create('comp-1', { format: 'mp4', quality: 'high' });

    expect(mockFetch).toHaveBeenCalledWith('/api/compositions/comp-1/render', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ format: 'mp4', quality: 'high' }),
    }));
    expect(result).toEqual(mockData);
  });

  it('list calls correct endpoint', async () => {
    const mockData = [{ id: 'render-1', composition_id: 'comp-1', status: 'completed', format: 'mp4', quality: 'high', progress: 100, total_frames: 300, completed_frames: 300, created_at: '' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await rendersApi.list('comp-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/compositions/comp-1/renders', expect.any(Object));
    expect(result).toEqual(mockData);
  });
});

describe('templatesApi', () => {
  it('list calls correct endpoint with category filter', async () => {
    const mockData = [{ id: 'tpl-1', name: 'Test', category: 'titles', html_template: '<div></div>', default_width: 1920, default_height: 1080, default_fps: 30, default_duration: 10, parameters_schema: {}, created_at: '', updated_at: '' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await templatesApi.list('titles');

    expect(mockFetch).toHaveBeenCalledWith('/api/compositions/templates?category=titles', expect.any(Object));
    expect(result).toEqual(mockData);
  });

  it('create posts to correct endpoint', async () => {
    const mockData = { id: 'tpl-new', name: 'New Template', category: 'titles', html_template: '<div></div>', default_width: 1920, default_height: 1080, default_fps: 30, default_duration: 10, parameters_schema: {}, created_at: '', updated_at: '' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await templatesApi.create({ name: 'New Template', category: 'titles', html_template: '<div></div>', default_width: 1920, default_height: 1080, default_fps: 30, default_duration: 10, parameters_schema: {} });

    expect(mockFetch).toHaveBeenCalledWith('/api/compositions/templates', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'New Template', category: 'titles', html_template: '<div></div>', default_width: 1920, default_height: 1080, default_fps: 30, default_duration: 10, parameters_schema: {} }),
    }));
    expect(result).toEqual(mockData);
  });
});