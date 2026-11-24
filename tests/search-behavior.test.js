// Markdown-Editor – GPL-3.0 (see LICENSE)
// Behavior tests for search.js: verify match finding, navigation, replace logic.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

function makeEl(tag) {
  const el = {
    tagName: tag, className: '', innerHTML: '', style: {},
    value: '', textContent: '', hidden: false,
    _listeners: {},
    appendChild() {}, remove() {}, focus() {}, select() {},
    setAttribute() {}, getAttribute() { return null; },
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
    dispatchEvent(evt) { (this._listeners[evt.type] || []).forEach(fn => fn(evt)); return true; },
    querySelector(sel) {
      if (!this._sub) this._sub = {};
      if (!this._sub[sel]) this._sub[sel] = makeEl('div');
      return this._sub[sel];
    },
    querySelectorAll() { return []; },
    closest() { return null; },
    contains() { return false; },
  };
  return el;
}

function setup(content, selStart, selEnd) {
  const selCalls = [];
  const editor = {
    value: content, selectionStart: selStart, selectionEnd: selEnd,
    setSelectionRange(s, e) { selCalls.push({ s, e }); this.selectionStart = s; this.selectionEnd = e; },
    setRangeText(text, s, e) {
      this.value = this.value.slice(0, s) + text + this.value.slice(e);
      this.selectionStart = s + text.length; this.selectionEnd = s + text.length;
    },
    focus() {}, addEventListener() {},
  };

  const divRef = { el: null };
  global.window = { addEventListener: () => {} };
  global.document = {
    createElement: (tag) => { const el = makeEl(tag); if (tag === 'div') divRef.el = el; return el; },
    body: { appendChild: () => {} },
  };
  global.Event = class { constructor(type, opts) { this.type = type; Object.assign(this, opts || {}); } };

  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'search.js'), 'utf8');
  eval(src);

  const ctx = {
    editor,
    pushUndo: () => {}, scheduleRender: () => {}, scheduleSave: () => {}, updateCount: () => {},
  };
  global.window.SearchModule.init(ctx);

  return { ctx, editor, selCalls, divRef };
}

test('search: openSearch with selection pre-fills input and finds matches', () => {
  const { ctx, selCalls, divRef } = setup('foo bar foo baz foo', 0, 3);
  ctx.openSearch(false);
  assert.ok(selCalls.length >= 1, 'setSelectionRange was called');
  assert.strictEqual(selCalls[0].s, 0);
  assert.strictEqual(selCalls[0].e, 3);
  assert.strictEqual(divRef.el.querySelector('.search-count').textContent, '1/3');
});

test('search: next match advances selection', () => {
  const { ctx, selCalls, divRef } = setup('foo bar foo baz foo', 0, 3);
  ctx.openSearch(false);
  const fakeTarget = { closest: (sel) => sel === 'button' ? { dataset: { action: 'next' } } : null };
  divRef.el.dispatchEvent({ type: 'click', target: fakeTarget });
  const last = selCalls[selCalls.length - 1];
  assert.strictEqual(last.s, 8);
  assert.strictEqual(last.e, 11);
  assert.strictEqual(divRef.el.querySelector('.search-count').textContent, '2/3');
});

test('search: prev match goes back', () => {
  const { ctx, selCalls, divRef } = setup('foo bar foo baz foo', 0, 3);
  ctx.openSearch(false);
  const nextTarget = { closest: (sel) => sel === 'button' ? { dataset: { action: 'next' } } : null };
  divRef.el.dispatchEvent({ type: 'click', target: nextTarget });
  const prevTarget = { closest: (sel) => sel === 'button' ? { dataset: { action: 'prev' } } : null };
  divRef.el.dispatchEvent({ type: 'click', target: prevTarget });
  const last = selCalls[selCalls.length - 1];
  assert.strictEqual(last.s, 0);
  assert.strictEqual(last.e, 3);
  assert.strictEqual(divRef.el.querySelector('.search-count').textContent, '1/3');
});

test('search: replaceAll replaces all occurrences', () => {
  const { ctx, editor, divRef } = setup('cat dog cat bird cat', 0, 3);
  ctx.openSearch(true);
  const rInput = divRef.el.querySelector('.replace-input');
  rInput.value = 'kitten';
  const fakeTarget = { closest: (sel) => sel === 'button' ? { dataset: { action: 'replaceAll' } } : null };
  divRef.el.dispatchEvent({ type: 'click', target: fakeTarget });
  assert.strictEqual(editor.value, 'kitten dog kitten bird kitten');
});

test('search: no match shows 0/0 and does not crash', () => {
  const { ctx, divRef } = setup('hello world', 0, 5);
  ctx.openSearch(false);
  const sInput = divRef.el.querySelector('.search-input');
  sInput.value = 'xyz';
  sInput.dispatchEvent({ type: 'input' });
  assert.strictEqual(divRef.el.querySelector('.search-count').textContent, '0/0');
});

test('search: case-insensitive matching', () => {
  const { ctx, divRef } = setup('Hello hello HELLO', 0, 5);
  ctx.openSearch(false);
  assert.strictEqual(divRef.el.querySelector('.search-count').textContent, '1/3');
});
