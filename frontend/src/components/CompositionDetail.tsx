/** Composition detail page. */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { compositionsApi, rendersApi } from '../api/client';
import type { CompositionResponse, RenderJobResponse, RenderJobCreate } from '../types/api';

export function CompositionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [composition, setComposition] = useState<CompositionResponse | null>(null);
  const [renders, setRenders] = useState<RenderJobResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderFormat, setRenderFormat] = useState<'mp4' | 'webm' | 'mov' | 'png-sequence'>('mp4');
  const [renderQuality, setRenderQuality] = useState<'low' | 'medium' | 'high' | 'ultra'>('high');

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [comp, renderJobs] = await Promise.all([
        compositionsApi.get(id),
        rendersApi.list(id),
      ]);
      setComposition(comp);
      setRenders(renderJobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load composition');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Poll for render job updates
  useEffect(() => {
    const runningRenders = renders.filter(r => r.status === 'running' || r.status === 'pending');
    if (runningRenders.length === 0) return;

    const interval = setInterval(() => {
      fetchData();
    }, 2000);

    return () => clearInterval(interval);
  }, [renders, id]);

  const handleRender = async () => {
    if (!id) return;
    setRendering(true);
    try {
      const config: RenderJobCreate = { format: renderFormat, quality: renderQuality };
      await rendersApi.create(id, config);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start render');
    } finally {
      setRendering(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !composition) return;
    if (!confirm(`Delete composition "${composition.name}"? This cannot be undone.`)) return;

    try {
      await compositionsApi.delete(id);
      navigate('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete composition');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !composition) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', color: 'var(--color-error)' }}>
          <p>{error || 'Composition not found'}</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 'var(--spacing-md)' }}>
            Back to Compositions
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const getStatusBadge = (status: string) => (
    <span className={`badge badge-${status}`}>{status}</span>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{composition.name}</h2>
          {composition.description && <p>{composition.description}</p>}
        </div>
        <div className="page-actions">
          <Link to={`/compositions/${id}/edit`} className="btn btn-secondary">
            Edit
          </Link>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--spacing-lg)' }}>
        <div>
          <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <div className="card-header">
              <h3>Composition Details</h3>
            </div>
            <div className="card-body">
              <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--spacing-xs) var(--spacing-md)', fontSize: 14 }}>
                <dt style={{ color: 'var(--color-text-secondary)' }}>ID</dt>
                <dd><code>{composition.id}</code></dd>
                <dt style={{ color: 'var(--color-text-secondary)' }}>Dimensions</dt>
                <dd>{composition.width} × {composition.height}</dd>
                <dt style={{ color: 'var(--color-text-secondary)' }}>Duration</dt>
                <dd>{composition.duration}s</dd>
                <dt style={{ color: 'var(--color-text-secondary)' }}>FPS</dt>
                <dd>{composition.fps}</dd>
                <dt style={{ color: 'var(--color-text-secondary)' }}>Total Frames</dt>
                <dd>{Math.round(composition.duration * composition.fps)}</dd>
                <dt style={{ color: 'var(--color-text-secondary)' }}>Created</dt>
                <dd>{formatDate(composition.created_at)}</dd>
                <dt style={{ color: 'var(--color-text-secondary)' }}>Updated</dt>
                <dd>{formatDate(composition.updated_at)}</dd>
              </dl>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <div className="card-header">
              <h3>HTML Source</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <pre style={{ margin: 0, maxHeight: 400, overflow: 'auto' }}>
                <code>{composition.html_content}</code>
              </pre>
            </div>
          </div>

          {(composition.css_content || composition.js_content) && (
            <div className="card">
              <div className="tabs" role="tablist" style={{ margin: 0 }}>
                {composition.css_content && (
                  <button
                    role="tab"
                    className="tab"
                    onClick={() => {}}
                  >
                    CSS
                  </button>
                )}
                {composition.js_content && (
                  <button
                    role="tab"
                    className="tab"
                    onClick={() => {}}
                  >
                    JavaScript
                  </button>
                )}
              </div>
              <div className="card-body" style={{ maxHeight: 300, overflow: 'auto' }}>
                {composition.css_content && (
                  <pre><code>{composition.css_content}</code></pre>
                )}
                {composition.js_content && (
                  <pre><code>{composition.js_content}</code></pre>
                )}
              </div>
            </div>
          )}
        </div>

        <aside>
          <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <div className="card-header">
              <h3>Render Video</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label" htmlFor="render-format">Format</label>
                <select
                  id="render-format"
                  className="form-input"
                  value={renderFormat}
                  onChange={(e) => setRenderFormat(e.target.value as typeof renderFormat)}
                >
                  <option value="mp4">MP4 (H.264)</option>
                  <option value="webm">WebM (VP9)</option>
                  <option value="mov">MOV (ProRes)</option>
                  <option value="png-sequence">PNG Sequence</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="render-quality">Quality</label>
                <select
                  id="render-quality"
                  className="form-input"
                  value={renderQuality}
                  onChange={(e) => setRenderQuality(e.target.value as typeof renderQuality)}
                >
                  <option value="low">Low (Fast)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra (Slow)</option>
                </select>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleRender}
                disabled={rendering}
              >
                {rendering ? 'Starting...' : 'Start Render'}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Render Jobs</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {renders.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--spacing-lg)' }}>
                  <div className="empty-state-icon">🎬</div>
                  <p>No render jobs yet</p>
                  <p style={{ fontSize: 13 }}>Click "Start Render" to create one</p>
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: 400, overflow: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Format</th>
                        <th>Progress</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renders.map((render) => (
                        <tr key={render.id}>
                          <td>{getStatusBadge(render.status)}</td>
                          <td>{render.format.toUpperCase()}</td>
                          <td>
                            {render.status === 'completed' ? '100%' :
                             render.status === 'running' ? `${render.progress}%` :
                             render.status === 'pending' ? 'Queued' :
                             render.error_message ? 'Failed' : '—'}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            {formatDate(render.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}