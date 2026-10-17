/** Utilities for building live preview documents from composition fields. */

const GSAP_CDN = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js';

/**
 * Build a complete HTML document for iframe live preview.
 *
 * The composition's html_content, css_content, and js_content are combined
 * into a standalone document with GSAP loaded from CDN (preview only).
 */
export function buildPreviewDocument(
  htmlContent: string,
  cssContent?: string | null,
  jsContent?: string | null,
): string {
  const css = cssContent?.trim() ? cssContent : '';
  const js = jsContent?.trim() ? jsContent : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    ${css}
  </style>
  <script src="${GSAP_CDN}"></script>
</head>
<body>
  ${htmlContent}
  ${js ? `<script>${js}</script>` : ''}
</body>
</html>`;
}