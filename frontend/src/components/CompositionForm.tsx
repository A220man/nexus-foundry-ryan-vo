/** Composition form for create/edit with Monaco editor and live preview. */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { compositionsApi, ApiError } from '../api/client';
import { buildPreviewDocument } from '../utils/compositionPreview';
import type { CompositionCreate, CompositionUpdate, ValidationResponse } from '../types/api';

// Lazy-load Monaco so the bundle stays small for tests and initial render.
import { Editor } from '@monaco-editor/react';

export function CompositionForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<CompositionCreate | CompositionUpdate>({
    name: '',
    description: '',
    html_content: '',
    css_content: '',
    js_content: '',
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 10.0,
    meta: {},
  });

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');

  // Load composition if editing
  useEffect(() => {
    if (isEditing && id) {
      loadComposition(id);
    } else {
      // Set default HTML template for new compositions
      setFormData(prev => ({
        ...prev,
        html_content: getDefaultHtmlTemplate(),
      }));
      setLoading(false);
    }
  }, [id, isEditing]);

  const loadComposition = async (compositionId: string) => {
    try {
      const data = await compositionsApi.get(compositionId);
      setFormData({
        name: data.name,
        description: data.description || '',
        html_content: data.html_content,
        css_content: data.css_content || '',
        js_content: data.js_content || '',
        width: data.width,
        height: data.height,
        fps: data.fps,
        duration: data.duration,
        meta: data.meta,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load composition');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultHtmlTemplate = () => `<div id="root" data-composition-id="main" data-start="0" data-duration="10"
     data-width="1920" data-height="1080" data-fps="30">
  <!-- Add your composition elements here -->
  <div class="scene" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #0d1117;">
    <h1 style="font-family: system-ui; color: #e6edf3;">New Composition</h1>
  </div>
</div>
<script>
  const tl = gsap.timeline({ paused: true });
  // Add your animations here
  tl.to(".scene", { opacity: 1, duration: 1 }, 0);
  window.__timelines = { main: tl };
</script>`;

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setValidation(null);
  };

  // Live preview document — recomputed when editor content changes
  const previewDoc = useMemo(() => {
    return buildPreviewDocument(
      formData.html_content || '',
      formData.css_content,
      formData.js_content,
    );
  }, [formData.html_content, formData.css_content, formData.js_content]);

  const handleValidate = async () => {
    const html = formData.html_content || '';
    if (!html.trim()) {
      setValidation({ valid: false, errors: ['HTML content is required'], warnings: [] });
      return;
    }

    try {
      const result = await compositionsApi.validate(html);
      setValidation(result);
    } catch (err) {
      setValidation({ valid: false, errors: [err instanceof Error ? err.message : 'Validation failed'], warnings: [] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (isEditing && id) {
        await compositionsApi.update(id, formData as CompositionUpdate);
      } else {
        const created = await compositionsApi.create(formData as CompositionCreate);
        navigate(`/compositions/${created.id}`);
        return;
      }
      navigate(`/compositions/${id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const detail = err.detail as { errors?: string[]; warnings?: string[] } | undefined;
        setValidation({
          valid: false,
          errors: detail?.errors || ['Validation failed'],
          warnings: detail?.warnings || [],
        });
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save composition');
      }
    } finally {
      setSaving(false);
    }
  };

  // Monaco editor options
  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 13,
    lineHeight: 1.5,
    tabSize: 2,
    wordWrap: 'on' as const,
    automaticLayout: true,
    scrollBeyondLastLine: false,
  };

  const editorLanguage: Record<string, string> = { html: 'html', css: 'css', js: 'javascript' };
  const editorPlaceholder: Record<string, string> = {
    html: 'Composition HTML (required)...',
    css: 'Optional styles...',
    js: 'Optional JavaScript (GSAP timeline)...',
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" role="status" aria-label="Loading composition" />
      </div>
    );
  }

  return (
    <div className="composition-form-page">
      <form id="composition-form" onSubmit={handleSubmit}>
        <div className="page-header">
          <div>
            <h2>{isEditing ? 'Edit Composition' : 'New Composition'}</h2>
            <p>{isEditing ? 'Update your video composition' : 'Create a new video composition from HTML'}</p>
          </div>
          <div className="page-actions">
            <Link to={isEditing ? `/compositions/${id}` : '/'} className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" form="composition-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Composition'}
            </button>
          </div>
        </div>

        {error && (
          <div className="card" style={{ marginBottom: 'var(--spacing-md)', borderColor: 'var(--color-error)' }}>
            <div className="card-body" style={{ color: 'var(--color-error)' }}>
              {error}
            </div>
          </div>
        )}

        {/* Metadata fields */}
        <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
          <div className="card-header">
            <h3>Composition Settings</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label" htmlFor="name">Name *</label>
              <input
                id="name"
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="My Video Composition"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">Description</label>
              <textarea
                id="description"
                className="form-textarea"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="width">Width</label>
                <input
                  id="width"
                  type="number"
                  className="form-input"
                  value={formData.width}
                  onChange={(e) => handleChange('width', parseInt(e.target.value) || 0)}
                  min={1}
                  max={7680}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="height">Height</label>
                <input
                  id="height"
                  type="number"
                  className="form-input"
                  value={formData.height}
                  onChange={(e) => handleChange('height', parseInt(e.target.value) || 0)}
                  min={1}
                  max={4320}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="fps">FPS</label>
                <input
                  id="fps"
                  type="number"
                  className="form-input"
                  value={formData.fps}
                  onChange={(e) => handleChange('fps', parseInt(e.target.value) || 0)}
                  min={1}
                  max={120}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="duration">Duration (s)</label>
                <input
                  id="duration"
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={formData.duration}
                  onChange={(e) => handleChange('duration', parseFloat(e.target.value) || 0)}
                  min={0.1}
                  max={3600}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Editor + Live Preview split view */}
        <div className="editor-preview-container">
          <div className="editor-panel">
            <div className="tabs" role="tablist">
              <button
                role="tab"
                className={`tab ${activeTab === 'html' ? 'active' : ''}`}
                onClick={() => setActiveTab('html')}
                aria-selected={activeTab === 'html'}
              >
                HTML
              </button>
              <button
                role="tab"
                className={`tab ${activeTab === 'css' ? 'active' : ''}`}
                onClick={() => setActiveTab('css')}
                aria-selected={activeTab === 'css'}
              >
                CSS
              </button>
              <button
                role="tab"
                className={`tab ${activeTab === 'js' ? 'active' : ''}`}
                onClick={() => setActiveTab('js')}
                aria-selected={activeTab === 'js'}
              >
                JavaScript
              </button>
            </div>

            <div className="editor-body">
              <Editor
                height="400px"
                language={editorLanguage[activeTab]}
                value={
                  activeTab === 'html' ? formData.html_content :
                  activeTab === 'css' ? formData.css_content :
                  formData.js_content
                }
                options={{ ...editorOptions, placeholder: editorPlaceholder[activeTab] }}
                onChange={(value) => handleChange(
                  activeTab === 'html' ? 'html_content' :
                  activeTab === 'css' ? 'css_content' :
                  'js_content',
                  value || '',
                )}
              />

              {activeTab === 'html' && (
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleValidate}
                  >
                    Validate HTML
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="preview-panel">
            <div className="preview-header">
              <span className="preview-label">Live Preview</span>
            </div>
            <iframe
              title="Composition Live Preview"
              className="live-preview"
              srcDoc={previewDoc}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>

        {validation && (
          <div className="validation-messages">
            <h4>{validation.valid ? '✓ Valid' : '✗ Validation Errors'}</h4>
            {validation.errors.length > 0 && (
              <div className="errors">
                <strong>Errors:</strong>
                <ul>
                  {validation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className="warnings">
                <strong>Warnings:</strong>
                <ul>
                  {validation.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Required HTML Structure reference */}
        <div className="card">
          <div className="card-header">
            <h3>Required HTML Structure</h3>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-sm)', fontSize: 13 }}>
              The root element must include these data attributes:
            </p>
            <pre><code>{`data-composition-id="main"
data-start="0"
data-duration="10"
data-width="1920"
data-height="1080"
data-fps="30"`}</code></pre>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-md)', fontSize: 13 }}>
              Include a paused GSAP timeline registered to <code>window.__timelines</code>.
              Video elements need <code>data-track-index</code>, <code>muted</code>, and <code>playsinline</code> attributes.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}