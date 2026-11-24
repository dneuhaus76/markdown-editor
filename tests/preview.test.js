// Markdown-Editor – GPL-3.0 (see LICENSE)
// Smoke tests for preview.js: module loads, exposes correct API.
// Deep testing requires DOM stubs (getComputedStyle, matchMedia) – tracked as backlog.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Minimal browser globals so the IIFE doesn't throw on load.
global.window = {
  mermaid: null,
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
};
global.document = {
  getElementById: () => ({ addEventListener: () => {} }),
  createElement: () => ({ className: '', innerHTML: '', appendChild: () => {}, remove: () => {}, children: [] }),
  body: { dataset: {} },
};
global.getComputedStyle = () => ({ paddingTop: '0', paddingBottom: '0', marginTop: '0', marginBottom: '0' });
global.Markdown = { parse: () => '' };
global.MDConfig = { A4_HEIGHT_MM: 297, PX_PER_MM: 3.78, RENDER_DEBOUNCE_MS: 150 };

// Load the module in a sandboxed context.
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'preview.js'), 'utf8');
eval(src);

test('PreviewModule is exposed on window', () => {
  assert.strictEqual(typeof global.window.PreviewModule, 'object');
});

test('PreviewModule.init is a function', () => {
  assert.strictEqual(typeof global.window.PreviewModule.init, 'function');
});

test('init does not throw with minimal ctx', () => {
  const ctx = {
    editor: { value: '', addEventListener: () => {}, scrollTop: 0, scrollHeight: 100, clientHeight: 50 },
    preview: { innerHTML: '', classList: { toggle: () => {} }, querySelectorAll: () => [], addEventListener: () => {}, scrollTop: 0, scrollHeight: 100, clientHeight: 50 },
  };
  // Should not throw. May call render internally.
  global.window.PreviewModule.init(ctx);
});
