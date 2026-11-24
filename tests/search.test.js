// Markdown-Editor – GPL-3.0 (see LICENSE)
// Smoke tests for search.js: module loads, exposes correct API.
// Core search/replace logic is inline in the IIFE (not exported as pure functions).
// Deep testing requires refactoring to extract searchMatches/replaceAll as pure fns – backlog.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

global.window = { addEventListener: () => {} };
global.document = {
  createElement: () => ({
    className: '', innerHTML: '', style: {},
    appendChild: () => {}, remove: () => {},
    querySelector: () => ({ value: '', textContent: '', style: {}, addEventListener: () => {}, focus: () => {}, select: () => {}, dispatchEvent: () => {} }),
    querySelectorAll: () => [],
    addEventListener: () => {},
  }),
  body: { appendChild: () => {} },
};
global.Event = class { constructor(type, opts) { this.type = type; } };

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'search.js'), 'utf8');
eval(src);

test('SearchModule is exposed on window', () => {
  assert.strictEqual(typeof global.window.SearchModule, 'object');
});

test('SearchModule.init is a function', () => {
  assert.strictEqual(typeof global.window.SearchModule.init, 'function');
});

test('init exposes openSearch and closeSearch on ctx', () => {
  const ctx = {
    editor: {
      value: 'hello world hello',
      selectionStart: 0, selectionEnd: 0,
      setSelectionRange: () => {}, setRangeText: () => {},
      focus: () => {}, addEventListener: () => {},
    },
    pushUndo: () => {}, scheduleRender: () => {}, scheduleSave: () => {}, updateCount: () => {},
  };
  global.window.SearchModule.init(ctx);
  assert.strictEqual(typeof ctx.openSearch, 'function');
  assert.strictEqual(typeof ctx.closeSearch, 'function');
});
