// Markdown-Editor – GPL-3.0 (see LICENSE)
// Smoke tests for config.js and ui.js: modules load, expose correct API.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// ---------- config.js ----------
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8'));

test('MDConfig is exposed and frozen', () => {
  assert.strictEqual(typeof global.window.MDConfig, 'object');
  assert.ok(Object.isFrozen(global.window.MDConfig));
});

test('MDConfig has expected keys', () => {
  const cfg = global.window.MDConfig;
  assert.strictEqual(cfg.STORAGE_KEY, 'md-editor-content');
  assert.strictEqual(cfg.SPLIT_KEY, 'md-editor-split');
  assert.strictEqual(cfg.RENDER_DEBOUNCE_MS, 150);
  assert.strictEqual(cfg.SAVE_DEBOUNCE_MS, 500);
  assert.strictEqual(cfg.UNDO_LIMIT, 100);
  assert.ok(Math.abs(cfg.PX_PER_MM - 96 / 25.4) < 0.001);
  assert.strictEqual(cfg.A4_HEIGHT_MM, 297);
  assert.strictEqual(cfg.MAX_IMAGE_BYTES, 5 * 1024 * 1024);
});

// ---------- ui.js ----------
global.window.matchMedia = () => ({ matches: false });
global.window.addEventListener = () => {};
global.document = {
  getElementById: () => ({
    addEventListener: () => {}, setAttribute: () => {}, classList: { toggle: () => {}, remove: () => {} },
    hidden: false, focus: () => {}, contains: () => false,
  }),
  querySelector: () => ({
    addEventListener: () => {}, style: { setProperty: () => {} },
    getBoundingClientRect: () => ({ left: 0, width: 100 }),
    classList: { add: () => {}, remove: () => {} },
    setPointerCapture: () => {},
  }),
  querySelectorAll: () => [],
  createElement: () => ({ className: '', textContent: '', appendChild: () => {} }),
  body: { dataset: {}, appendChild: () => {} },
  addEventListener: () => {},
  activeElement: null,
};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.Transform = {
  wrapSelection: () => ({ value: '', selStart: 0, selEnd: 0 }),
  prefixLines: () => ({ value: '', selStart: 0, selEnd: 0 }),
  indentLines: () => ({ value: '', selStart: 0, selEnd: 0 }),
  toggleTaskLines: () => ({ value: '', selStart: 0, selEnd: 0 }),
  codeblockTransform: () => null,
};
global.confirm = () => true;

eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'ui.js'), 'utf8'));

test('UIModule is exposed on window', () => {
  assert.strictEqual(typeof global.window.UIModule, 'object');
});

test('UIModule.init is a function', () => {
  assert.strictEqual(typeof global.window.UIModule.init, 'function');
});

test('init exposes updateCount on ctx', () => {
  const ctx = {
    editor: {
      value: 'hello world', selectionStart: 0, selectionEnd: 0,
      setSelectionRange: () => {}, focus: () => {}, addEventListener: () => {},
    },
    pushUndo: () => {}, dirty: () => {}, insertBlock: () => {},
    render: () => {}, openSearch: () => {}, closeSearch: () => {},
    undoStack: [], undo: () => {},
  };
  global.window.UIModule.init(ctx);
  assert.strictEqual(typeof ctx.updateCount, 'function');
});
