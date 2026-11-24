// Markdown-Editor – GPL-3.0 (see LICENSE)
// Smoke tests for app.js and editor-io.js: modules load, expose correct API.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// ---------- Shared stubs ----------
global.window = {
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  showSaveFilePicker: null,
  showOpenFilePicker: null,
};
global.document = {
  getElementById: (id) => ({
    addEventListener: () => {}, setAttribute: () => {},
    classList: { toggle: () => {}, remove: () => {} },
    hidden: false, focus: () => {}, contains: () => false,
    textContent: '', title: '', click: () => {}, value: '', files: null,
  }),
  querySelector: () => ({
    addEventListener: () => {}, style: { setProperty: () => {} },
    getBoundingClientRect: () => ({ left: 0, width: 100 }),
    classList: { add: () => {}, remove: () => {} },
    setPointerCapture: () => {},
  }),
  querySelectorAll: () => [],
  createElement: (tag) => ({
    className: '', textContent: '', innerHTML: '', href: '', download: '',
    appendChild: () => {}, click: () => {}, style: {},
  }),
  body: { dataset: {}, appendChild: () => {} },
  addEventListener: () => {},
  activeElement: null,
};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.getComputedStyle = () => ({ paddingTop: '0', paddingBottom: '0' });
global.Markdown = { parse: () => '' };
global.MDConfig = Object.freeze({
  STORAGE_KEY: 'md-editor-content', SPLIT_KEY: 'md-editor-split',
  RENDER_DEBOUNCE_MS: 150, SAVE_DEBOUNCE_MS: 500, UNDO_LIMIT: 100,
  PX_PER_MM: 96 / 25.4, A4_HEIGHT_MM: 297, MAX_IMAGE_BYTES: 5 * 1024 * 1024,
});
global.Transform = {
  wrapSelection: () => ({ value: '', selStart: 0, selEnd: 0 }),
  prefixLines: () => ({ value: '', selStart: 0, selEnd: 0 }),
  indentLines: () => ({ value: '', selStart: 0, selEnd: 0 }),
  toggleTaskLines: () => ({ value: '', selStart: 0, selEnd: 0 }),
  codeblockTransform: () => null,
};
global.PreviewModule = { init: () => {} };
global.SearchModule = { init: () => {} };
global.UIModule = { init: () => {} };
global.FileReader = class { readAsDataURL() {} readAsText() {} };
global.Blob = class { constructor(parts, opts) { this.parts = parts; } };
global.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} };
global.confirm = () => true;
global.alert = () => {};

// ---------- editor-io.js ----------
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'editor-io.js'), 'utf8'));

test('EditorIO is exposed on window', () => {
  assert.strictEqual(typeof global.window.EditorIO, 'object');
});

test('EditorIO.init is a function', () => {
  assert.strictEqual(typeof global.window.EditorIO.init, 'function');
});

test('init exposes setFileName on ctx', () => {
  const ctx = {
    editor: { value: '', addEventListener: () => {}, selectionStart: 0, selectionEnd: 0 },
    fileInput: { addEventListener: () => {}, click: () => {}, files: null, value: '' },
    pushUndo: () => {}, insertBlock: () => {}, render: () => {},
    scheduleSave: () => {}, updateCount: () => {},
  };
  global.window.EditorIO.init(ctx);
  assert.strictEqual(typeof ctx.setFileName, 'function');
});

// ---------- app.js ----------
// app.js is the orchestrator: runs immediately, no exported function.
// It calls PreviewModule.init, EditorIO.init, SearchModule.init, UIModule.init.
// Smoke test: it loads without throwing given all deps are stubbed.
test('app.js loads without throwing (orchestrator smoke)', () => {
  // app.js references EditorIO directly (not window.EditorIO).
  global.EditorIO = global.window.EditorIO;

  // Reset globals that app.js expects from the DOM.
  const editorEl = {
    value: '', selectionStart: 0, selectionEnd: 0,
    addEventListener: () => {}, setSelectionRange: () => {},
    setRangeText: () => {}, focus: () => {},
  };
  const previewEl = { innerHTML: '', classList: { toggle: () => {} }, querySelectorAll: () => [], addEventListener: () => {} };
  const fileInputEl = { addEventListener: () => {}, click: () => {}, files: null, value: '' };

  global.document.getElementById = (id) => {
    if (id === 'editor') return editorEl;
    if (id === 'preview') return previewEl;
    if (id === 'file-input') return fileInputEl;
    return { addEventListener: () => {}, setAttribute: () => {}, classList: { toggle: () => {} }, hidden: false, focus: () => {}, contains: () => false };
  };

  // app.js calls ctx.render() and ctx.updateCount() at the end.
  // Our stub modules set these on ctx during init.
  const origPreviewInit = global.PreviewModule.init;
  global.PreviewModule.init = (ctx) => { ctx.render = () => {}; ctx.scheduleRender = () => {}; };
  const origUIModuleInit = global.UIModule.init;
  global.UIModule.init = (ctx) => { ctx.updateCount = () => {}; };

  // Should not throw.
  eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8'));

  // Restore.
  global.PreviewModule.init = origPreviewInit;
  global.UIModule.init = origUIModuleInit;
});
