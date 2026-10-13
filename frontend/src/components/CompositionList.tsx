/** Composition list page. */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { compositionsApi } from '../api/client';
import type { CompositionResponse } from '../types/api';

export function CompositionList() {
  const [compositions, setCompositions] = useState<CompositionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const pageSize = 20;
  const fetchCompositions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await compositionsApi.list({ page, page_size: pageSize, search: search || undefined });
      setCompositions(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compositions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompositions();
  }, [page, search]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete composition "${name}"? This cannot be undone.`)) return;

    try {
      await compositionsApi.delete(id);
      // Refresh current page, or go to previous if last item deleted
      if (compositions.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchCompositions();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete composition');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" role="status" aria-label="Loading compositions" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', color: 'var(--color-error)' }}>
          <p>Error: {error}</p>
          <button className="btn btn-primary" onClick={fetchCompositions}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Compositions</h2>
          <p>Manage your video compositions</p>
        </div>
        <div className="page-actions">
          <Link to="/compositions/new" className="btn btn-primary">
            + New Composition
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', borderBottom: '1px solid var(--color-border)' }}>
            <input
              type="text"
              placeholder="Search compositions..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="form-input"
              style={{ maxWidth: 300, width: 'auto' }}
            />
          </div>

          {compositions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <h3>No compositions yet</h3>
              <p>Create your first video composition to get started.</p>
              <Link to="/compositions/new" className="btn btn-primary" style={{ marginTop: 'var(--spacing-md)' }}>
                Create Composition
              </Link>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Dimensions</th>
                      <th>Duration</th>
                      <th>FPS</th>
                      <th>Updated</th>
                      <th style={{ width: 140 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compositions.map((comp) => (
                      <tr key={comp.id}>
                        <td>
                          <Link to={`/compositions/${comp.id}`} style={{ fontWeight: 500 }}>
                            {comp.name}
                          </Link>
                          {comp.description && (
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                              {comp.description}
                            </div>
                          )}
                        </td>
                        <td>{comp.width} × {comp.height}</td>
                        <td>{comp.duration}s</td>
                        <td>{comp.fps}</td>
                        <td>
                          <time dateTime={comp.updated_at}>
                            {new Date(comp.updated_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                            <Link
                              to={`/compositions/${comp.id}`}
                              className="btn btn-ghost btn-sm"
                              title="View"
                            >
                              View
                            </Link>
                            <Link
                              to={`/compositions/${comp.id}/edit`}
                              className="btn btn-ghost btn-sm"
                              title="Edit"
                            >
                              Edit
                            </Link>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--color-error)' }}
                              onClick={() => handleDelete(comp.id, comp.name)}
                              title="Delete"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {total > pageSize && (
                <div className="card-header" style={{ justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {page} of {Math.ceil(total / pageSize)} ({total} total)
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                      disabled={page >= Math.ceil(total / pageSize)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}