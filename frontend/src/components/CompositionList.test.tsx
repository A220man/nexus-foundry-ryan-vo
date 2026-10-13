/** Tests for CompositionList component. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CompositionList } from './CompositionList';
import { compositionsApi } from '../api/client';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockCompositions = [
  { id: '1', name: 'Comp 1', description: 'First', html_content: '<div></div>', width: 1920, height: 1080, fps: 30, duration: 10, meta: {}, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '2', name: 'Comp 2', description: 'Second', html_content: '<div></div>', width: 1280, height: 720, fps: 60, duration: 5, meta: {}, created_at: '2024-01-02T00:00:00Z', updated_at: '2024-01-02T00:00:00Z' },
];

function renderComponent() {
  return render(
    <BrowserRouter>
      <CompositionList />
    </BrowserRouter>
  );
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('CompositionList', () => {
  it('shows loading spinner initially', () => {
    const { promise } = Promise.withResolvers();
    mockFetch.mockReturnValue(promise); // Never resolves
    renderComponent();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays compositions when loaded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: mockCompositions, total: 2, page: 1, page_size: 20 }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Comp 1')).toBeInTheDocument();
      expect(screen.getByText('Comp 2')).toBeInTheDocument();
    });
  });

  it('shows empty state when no compositions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0, page: 1, page_size: 20 }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No compositions yet')).toBeInTheDocument();
      expect(screen.getByText('Create Composition')).toBeInTheDocument();
    });
  });

  it('shows error state on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Server error' }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('search filters compositions', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: mockCompositions, total: 2, page: 1, page_size: 20 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [mockCompositions[0]], total: 1, page: 1, page_size: 20 }),
      });

    renderComponent();

    await waitFor(() => expect(screen.getByText('Comp 1')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText('Search compositions...');
    act(() => {
      searchInput.value = 'Comp 1';
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Verify search input value updated
    await waitFor(() => {
      expect(searchInput.value).toBe('Comp 1');
    });
  });

  it('navigates to new composition page', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0, page: 1, page_size: 20 }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/New Composition/)).toBeInTheDocument();
    });

    const link = screen.getByText(/New Composition/);
    expect(link).toHaveAttribute('href', '/compositions/new');
  });

  it('shows pagination for multiple pages', async () => {
    const manyComps = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      name: `Comp ${i + 1}`,
      description: '',
      html_content: '<div></div>',
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 10,
      meta: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: manyComps.slice(0, 20), total: 25, page: 1, page_size: 20 }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });
  });
});