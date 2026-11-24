// Markdown-Editor – GPL-3.0 (see LICENSE)
// Behavior tests for ui.js: word/char count, split clamping.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

function makeEl(tag) {
  const el = {
    tagName: tag, className: '', innerHTML: '', style: {},
    value: '', textContent: '', hidden: false, title: '',
    dataset: {},
    _listeners: {},
    appendChild() {}, remove() {}, focus() {}, select() {}, click() {},
    setAttribute(k, v) { this[k] = v; }, getAttribute(k) { return this[k] || null; },
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
    dispatchEvent(evt) { (this._listeners[evt.type] || []).forEach(fn => fn(evt)); return true; },
    querySelector() { return makeEl('div'); },
    querySelectorAll() { return []; },
    closest() { return null; },
    contains() { return false; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    setPointerCapture() {}, releasePointerCapture() {},
  };
  return el;
}

function setup() {
  const editor = makeEl('textarea');
  editor.value = '';
  editor.selectionStart = 0;
  editor.selectionEnd = 0;
  editor.setSelectionRange = (s, e) => { editor.selectionStart = s; editor.selectionEnd = e; };

  const statusBar = makeEl('div');
  const panes = makeEl('div');
  panes.style.setProperty = (k, v) => { panes._split = v; };
  const splitter = makeEl('div');
  const btnBurger = makeEl('button');
  const toolbarPanel = makeEl('div');
  toolbarPanel.hidden = true;
  const toolbarEl = makeEl('div');
  const preview = makeEl('div');
  const helpOverlay = makeEl('div');
  helpOverlay.hidden = true;
  const helpCloseBtn = makeEl('button');
  const btnHelp = makeEl('button');

  const els = {
    'btn-burger': btnBurger, 'toolbar-panel': toolbarPanel,
    'splitter': splitter, 'preview': preview,
    'help-overlay': helpOverlay, 'help-close': helpCloseBtn,
    'btn-help': btnHelp,
  };

  global.window = {
    addEventListener: () => {},
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  };
  let capturedStatusBar = null;
  global.document = {
    createElement: (tag) => makeEl(tag),
    body: { appendChild: (el) => { if (el.className === 'status-bar') capturedStatusBar = el; }, dataset: {}, querySelectorAll: () => [] },
    getElementById: (id) => els[id] || makeEl('div'),
    querySelector: (sel) => sel === '.toolbar' ? toolbarEl : sel === '.panes' ? panes : makeEl('div'),
    addEventListener: () => {},
    activeElement: null,
  };
  global.MDConfig = { SPLIT_KEY: 'md-split', A4_HEIGHT_MM: 297, PX_PER_MM: 3.78, RENDER_DEBOUNCE_MS: 150 };
  global.localStorage = { getItem: () => null, setItem: () => {} };
  global.confirm = () => true;
  global.alert = () => {};

  // Transform stub (ui.js calls Transform.*)
  global.Transform = {
    wrapSelection: (v, s, e, b, a, p, c) => ({ value: v, selStart: s, selEnd: e }),
    prefixLines: (v, s, e, p) => ({ value: v, selStart: s, selEnd: e }),
    indentLines: (v, s, e, d) => ({ value: v, selStart: s, selEnd: e }),
    codeblockTransform: () => null,
    toggleTaskLines: (v, s, e) => ({ value: v, selStart: s, selEnd: e }),
  };

  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui.js'), 'utf8');
  eval(src);

  const ctx = {
    editor,
    pushUndo: () => {},
    insertBlock: () => {},
    dirty: () => {},
    render: () => {},
    scheduleRender: () => {},
    scheduleSave: () => {},
    openSearch: () => {},
    closeSearch: () => {},
    undo: () => {},
    undoStack: [],
  };
  global.window.UIModule.init(ctx);

  return { ctx, editor, statusBar: capturedStatusBar, panes, splitter, toolbarEl, btnBurger, toolbarPanel };
}

test('ui: updateCount with empty string shows 0 words 0 chars', () => {
  const { ctx, editor, statusBar } = setup();
  editor.value = '';
  ctx.updateCount();
  assert.strictEqual(statusBar.textContent, '0 Wörter · 0 Zeichen');
});

test('ui: updateCount counts words and chars correctly', () => {
  const { ctx, editor, statusBar } = setup();
  editor.value = 'hello world foo';
  ctx.updateCount();
  assert.strictEqual(statusBar.textContent, '3 Wörter · 15 Zeichen');
});

test('ui: updateCount with whitespace only shows 0 words', () => {
  const { ctx, editor, statusBar } = setup();
  editor.value = '   \n\t  ';
  ctx.updateCount();
  // trim() → '' → 0 words, but text.length = 7
  assert.strictEqual(statusBar.textContent, '0 Wörter · 7 Zeichen');
});

test('ui: updateCount with single word', () => {
  const { ctx, editor, statusBar } = setup();
  editor.value = 'Markdown';
  ctx.updateCount();
  assert.strictEqual(statusBar.textContent, '1 Wörter · 8 Zeichen');
});

test('ui: splitter dblclick sets split to 50%', () => {
  const { panes, splitter } = setup();
  splitter.dispatchEvent({ type: 'dblclick' });
  assert.strictEqual(panes._split, '50%');
});
