/** Tests for composition preview document builder. */
import { describe, it, expect } from 'vitest';
import { buildPreviewDocument } from './compositionPreview';

const sampleHtml = `<div id="root" data-composition-id="main" data-start="0" data-duration="10"
     data-width="1920" data-height="1080" data-fps="30">
  <div class="scene">Hello</div>
</div>
<script>
  const tl = gsap.timeline({ paused: true });
  window.__timelines = { main: tl };
</script>`;

describe('buildPreviewDocument', () => {
  it('wraps html content in a complete HTML document', () => {
    const doc = buildPreviewDocument(sampleHtml);

    expect(doc).toContain('<!DOCTYPE html>');
    expect(doc).toContain('<html');
    expect(doc).toContain('</html>');
  });

  it('includes GSAP from CDN for live preview', () => {
    const doc = buildPreviewDocument(sampleHtml);

    expect(doc).toContain('gsap');
    expect(doc).toContain('cdn.jsdelivr.net/npm/gsap');
  });

  it('injects CSS content in a style tag', () => {
    const css = '.scene { background: red; }';
    const doc = buildPreviewDocument(sampleHtml, css);

    expect(doc).toContain('<style>');
    expect(doc).toContain('.scene { background: red; }');
  });

  it('injects JS content in a script tag when provided', () => {
    const js = 'console.log("init");';
    const doc = buildPreviewDocument(sampleHtml, null, js);

    // The injected JS should appear after the html content (in body)
    const bodyStart = doc.indexOf('<body>');
    const jsInBody = doc.indexOf(js, bodyStart);
    expect(jsInBody).toBeGreaterThan(-1);
  });

  it('omits the extra script tag when js is empty', () => {
    const doc = buildPreviewDocument(sampleHtml, null, undefined);

    // Should still contain the html content's embedded script
    expect(doc).toContain('window.__timelines');
    // Should not contain an extra empty script injection
    expect(doc).not.toContain('<script></script>');
  });

  it('handles empty CSS and JS gracefully', () => {
    const doc = buildPreviewDocument(sampleHtml, '', '');

    expect(doc).toContain('<!DOCTYPE html>');
    expect(doc).toContain(sampleHtml);
    expect(doc).toContain('gsap');
  });

  it('preserves html content exactly in the body', () => {
    const doc = buildPreviewDocument(sampleHtml);

    expect(doc).toContain(sampleHtml);
  });
});