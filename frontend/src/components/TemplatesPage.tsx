/** Templates page. */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { templatesApi } from '../api/client';
import type { TemplateResponse, TemplateCreate } from '../types/api';

const DEFAULT_TEMPLATES: Omit<TemplateCreate, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Lower Third',
    description: 'Simple lower third title overlay',
    category: 'titles',
    html_template: `<div data-composition-id="lower-third" data-start="0" data-duration="5"
     data-width="1920" data-height="1080" data-fps="30">
  <div class="lower-third">
    <span class="name">{{name}}</span>
    <span class="title">{{title}}</span>
  </div>
</div>`,
    css_template: `.lower-third { position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); padding: 16px 32px; border-radius: 8px; color: white; }
.name { display: block; font-size: 28px; font-weight: 600; }
.title { display: block; font-size: 18px; opacity: 0.8; }`,
    js_template: `const tl = gsap.timeline({ paused: true });
tl.from('.lower-third', { y: 100, opacity: 0, duration: 0.5, ease: 'power2.out' });
window.__timelines = { 'lower-third': tl };`,
    default_width: 1920,
    default_height: 1080,
    default_fps: 30,
    default_duration: 5.0,
    parameters_schema: {
      type: 'object',
      properties: { name: { type: 'string' }, title: { type: 'string' } },
      required: ['name', 'title'],
    },
  },
  {
    name: 'Center Title',
    description: 'Centered title with fade animation',
    category: 'titles',
    html_template: `<div data-composition-id="center-title" data-start="0" data-duration="5"
     data-width="1920" data-height="1080" data-fps="30">
  <div class="center-title">
    <h1 class="main">{{title}}</h1>
    <p class="subtitle">{{subtitle}}</p>
  </div>
</div>`,
    css_template: `.center-title { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white; }
.main { font-size: 64px; font-weight: 700; margin-bottom: 16px; }
.subtitle { font-size: 24px; opacity: 0.8; }`,
    js_template: `const tl = gsap.timeline({ paused: true });
tl.from('.main', { y: 50, opacity: 0, duration: 0.8, ease: 'power3.out' })
  .from('.subtitle', { y: 30, opacity: 0, duration: 0.6, ease: 'power3.out' }, '-=0.4');
window.__timelines = { 'center-title': tl };`,
    default_width: 1920,
    default_height: 1080,
    default_fps: 30,
    default_duration: 5.0,
    parameters_schema: {
      type: 'object',
      properties: { title: { type: 'string' }, subtitle: { type: 'string' } },
      required: ['title'],
    },
  },
  {
    name: 'Slide Transition',
    description: 'Slide transition between scenes',
    category: 'transitions',
    html_template: `<div data-composition-id="slide-transition" data-start="0" data-duration="1"
     data-width="1920" data-height="1080" data-fps="30">
  <div class="slide" style="background: {{color}};"></div>
</div>`,
    css_template: `.slide { position: absolute; inset: 0; transform: translateX(-100%); }`,
    js_template: `const tl = gsap.timeline({ paused: true });
tl.to('.slide', { xPercent: 0, duration: 0.5, ease: 'power2.inOut' })
  .to('.slide', { xPercent: 100, duration: 0.5, ease: 'power2.inOut' }, '+=0.2');
window.__timelines = { 'slide-transition': tl };`,
    default_width: 1920,
    default_height: 1080,
    default_fps: 30,
    default_duration: 1.0,
    parameters_schema: {
      type: 'object',
      properties: { color: { type: 'string', default: '#000000' } },
      required: [],
    },
  },
  {
    name: 'Social Media Story',
    description: 'Vertical 9:16 format for stories/reels',
    category: 'social',
    html_template: `<div data-composition-id="story" data-start="0" data-duration="15"
     data-width="1080" data-height="1920" data-fps="30">
  <div class="story-bg" style="background: {{bgColor}};"></div>
  <div class="story-content">
    <h1>{{title}}</h1>
    <p>{{body}}</p>
  </div>
</div>`,
    css_template: `.story-bg { position: absolute; inset: 0; }
.story-content { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white; width: 80%; }
h1 { font-size: 48px; font-weight: 700; margin-bottom: 24px; }
p { font-size: 24px; opacity: 0.9; }`,
    js_template: `const tl = gsap.timeline({ paused: true });
tl.from('h1', { y: 100, opacity: 0, duration: 0.8, ease: 'power3.out' })
  .from('p', { y: 50, opacity: 0, duration: 0.6, ease: 'power3.out' }, '-=0.3');
window.__timelines = { story: tl };`,
    default_width: 1080,
    default_height: 1920,
    default_fps: 30,
    default_duration: 15.0,
    parameters_schema: {
      type: 'object',
      properties: { title: { type: 'string' }, body: { type: 'string' }, bgColor: { type: 'string', default: '#0d1117' } },
      required: ['title', 'body'],
    },
  },
];

export function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState<Partial<TemplateCreate>>({
    name: '',
    description: '',
    category: 'titles',
    html_template: '',
    css_template: '',
    js_template: '',
    default_width: 1920,
    default_height: 1080,
    default_fps: 30,
    default_duration: 10.0,
    parameters_schema: {},
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const categories = ['titles', 'transitions', 'social', 'effects', 'overlays', 'other'];

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await templatesApi.list(categoryFilter || undefined);
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      await templatesApi.create(formData as TemplateCreate);
      setShowCreate(false);
      setFormData({
        name: '',
        description: '',
        category: 'titles',
        html_template: '',
        css_template: '',
        js_template: '',
        default_width: 1920,
        default_height: 1080,
        default_fps: 30,
        default_duration: 10.0,
        parameters_schema: {},
      });
      fetchTemplates();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  const seedDefaults = async () => {
    try {
      for (const tpl of DEFAULT_TEMPLATES) {
        await templatesApi.create(tpl);
      }
      fetchTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to seed defaults');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  const filteredTemplates = templates.filter(t => !categoryFilter || t.category === categoryFilter);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Templates</h2>
          <p>Reusable composition templates for common video patterns</p>
        </div>
        <div className="page-actions" style={{ flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
          <button className="btn btn-secondary" onClick={seedDefaults}>
            Seed Defaults
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Template
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

      <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div className="card-body" style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Filter by category:</span>
            <button
              className={`btn btn-sm ${!categoryFilter ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategoryFilter(null)}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Template</h3>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {createError && (
                  <div style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-sm)', background: 'rgba(248,81,73,0.1)', borderRadius: 'var(--radius-sm)' }}>
                    {createError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="tpl-name">Name *</label>
                  <input
                    id="tpl-name"
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="tpl-description">Description</label>
                  <textarea
                    id="tpl-description"
                    className="form-input"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    rows={2}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="tpl-category">Category *</label>
                  <select
                    id="tpl-category"
                    className="form-input"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="tpl-width">Width</label>
                    <input
                      id="tpl-width"
                      type="number"
                      className="form-input"
                      value={formData.default_width}
                      onChange={e => setFormData({...formData, default_width: parseInt(e.target.value) || 0})}
                      min={1} max={7680}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="tpl-height">Height</label>
                    <input
                      id="tpl-height"
                      type="number"
                      className="form-input"
                      value={formData.default_height}
                      onChange={e => setFormData({...formData, default_height: parseInt(e.target.value) || 0})}
                      min={1} max={4320}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="tpl-fps">FPS</label>
                    <input
                      id="tpl-fps"
                      type="number"
                      className="form-input"
                      value={formData.default_fps}
                      onChange={e => setFormData({...formData, default_fps: parseInt(e.target.value) || 0})}
                      min={1} max={120}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="tpl-duration">Duration</label>
                    <input
                      id="tpl-duration"
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={formData.default_duration}
                      onChange={e => setFormData({...formData, default_duration: parseFloat(e.target.value) || 0})}
                      min={0.1} max={3600}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="tpl-html">HTML Template *</label>
                  <textarea
                    id="tpl-html"
                    className="form-textarea"
                    value={formData.html_template}
                    onChange={e => setFormData({...formData, html_template: e.target.value})}
                    placeholder="HTML with {{parameters}}..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="tpl-css">CSS Template</label>
                  <textarea
                    id="tpl-css"
                    className="form-textarea"
                    value={formData.css_template}
                    onChange={e => setFormData({...formData, css_template: e.target.value})}
                    placeholder="Optional CSS..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="tpl-js">JavaScript Template</label>
                  <textarea
                    id="tpl-js"
                    className="form-textarea"
                    value={formData.js_template}
                    onChange={e => setFormData({...formData, js_template: e.target.value})}
                    placeholder="Optional JS with GSAP timeline..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {filteredTemplates.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--spacing-xl)' }}>
              <div className="empty-state-icon">📋</div>
              <h3>No templates found</h3>
              <p>Click "Seed Defaults" to add built-in templates, or create your own.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Dimensions</th>
                    <th>Duration</th>
                    <th>Parameters</th>
                    <th>Created</th>
                    <th style={{ width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((tpl) => (
                    <tr key={tpl.id}>
                      <td style={{ fontWeight: 500 }}>{tpl.name}</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(88,166,255,0.2)', color: 'var(--color-accent)' }}>
                          {tpl.category}
                        </span>
                      </td>
                      <td>{tpl.default_width} × {tpl.default_height}</td>
                      <td>{tpl.default_duration}s</td>
                      <td>
                        <code style={{ fontSize: 12 }}>
                          {Object.keys(tpl.parameters_schema.properties || {}).join(', ') || '—'}
                        </code>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {new Date(tpl.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <Link to={`/compositions/new?template=${tpl.id}`} className="btn btn-ghost btn-sm">
                          Use
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}