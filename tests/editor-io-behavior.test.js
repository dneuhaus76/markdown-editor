// Markdown-Editor – GPL-3.0 (see LICENSE)
// Behavior tests for editor-io.js: image validation, alt-text, export fallback, md-drop routing.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

function makeEl(tag) {
  const el = {
    tagName: tag, className: '', innerHTML: '', style: {},
    value: '', textContent: '', hidden: false, title: '',
    _listeners: {},
    appendChild() {}, remove() {}, focus() {}, select() {}, click() {},
    setAttribute() {}, getAttribute() { return null; },
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
    dispatchEvent(evt) { (this._listeners[evt.type] || []).forEach(fn => fn(evt)); return true; },
    querySelector() { return makeEl('div'); },
    querySelectorAll() { return []; },
    closest() { return null; },
    contains() { return false; },
  };
  return el;
}

function setup(opts = {}) {
  const alerts = [];
  const confirms = [];
  let confirmResult = opts.confirmResult !== undefined ? opts.confirmResult : true;
  const insertBlocks = [];
  const blobs = [];
  let objectUrls = [];
  let clickedAnchors = [];

  // FileReader stub: fires onload synchronously with provided result
  class FileReaderStub {
    constructor() { this.result = null; }
    readAsDataURL(file) {
      if (opts.fileReaderResult !== undefined) {
        this.result = opts.fileReaderResult;
        setTimeout(() => this.onload && this.onload(), 0);
      } else {
        setTimeout(() => this.onerror && this.onerror(new Error('fail')), 0);
      }
    }
    readAsText(file) {
      if (opts.fileReaderText !== undefined) {
        this.result = opts.fileReaderText;
        setTimeout(() => this.onload && this.onload(), 0);
      }
    }
  }

  // DOM stubs
  const editor = makeEl('textarea');
  editor.value = 'initial content';
  const fileInput = makeEl('input');
  fileInput.files = null;
  const btnExport = makeEl('button');
  const btnImport = makeEl('button');

  global.window = {
    addEventListener: () => {},
    showSaveFilePicker: opts.showSaveFilePicker !== undefined ? opts.showSaveFilePicker : undefined,
    showOpenFilePicker: opts.showOpenFilePicker !== undefined ? opts.showOpenFilePicker : undefined,
  };
  global.document = {
    createElement: (tag) => makeEl(tag),
    body: { appendChild: () => {} },
    getElementById: (id) => {
      if (id === 'btn-export') return btnExport;
      if (id === 'btn-import') return btnImport;
      return makeEl('div');
    },
  };
  global.MDConfig = { MAX_IMAGE_BYTES: 5 * 1024 * 1024 };
  global.FileReader = FileReaderStub;
  global.alert = (msg) => alerts.push(msg);
  global.confirm = (msg) => { confirms.push(msg); return confirmResult; };
  global.Blob = class { constructor(parts, opts) { this.parts = parts; this.type = opts ? opts.type : ''; blobs.push(this); } };
  global.URL = {
    createObjectURL: (blob) => { const u = 'blob:fake-' + objectUrls.length; objectUrls.push(u); return u; },
    revokeObjectURL: () => {},
  };

  // Load editor-io.js
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'editor-io.js'), 'utf8');
  eval(src);

  const ctx = {
    editor,
    fileInput,
    pushUndo: () => {},
    insertBlock: (text) => insertBlocks.push(text),
    render: () => {},
    scheduleSave: () => {},
    updateCount: () => {},
    setFileName: () => {},
  };
  global.window.EditorIO.init(ctx);

  return { ctx, editor, fileInput, btnExport, btnImport, alerts, confirms, insertBlocks, blobs, objectUrls, clickedAnchors };
}

function tick() { return new Promise(r => setTimeout(r, 5)); }

test('editor-io: oversize image is rejected, nothing inserted', async () => {
  const { editor, alerts, insertBlocks } = setup();
  const bigFile = { type: 'image/png', size: 6 * 1024 * 1024, name: 'big.png' };
  editor.dispatchEvent({ type: 'drop', preventDefault() {}, dataTransfer: { files: [bigFile] } });
  await tick();
  assert.strictEqual(alerts.length, 1, 'alert fired for oversize');
  assert.ok(alerts[0].includes('zu gross'), 'alert mentions size');
  assert.strictEqual(insertBlocks.length, 0, 'nothing inserted');
});

test('editor-io: valid image gets alt text from filename (extension stripped)', async () => {
  const { editor, insertBlocks } = setup({ fileReaderResult: 'data:image/png;base64,AAAA' });
  const imgFile = { type: 'image/png', size: 100, name: 'my photo.PNG' };
  editor.dispatchEvent({ type: 'drop', preventDefault() {}, dataTransfer: { files: [imgFile] } });
  await tick();
  assert.strictEqual(insertBlocks.length, 1, 'one block inserted');
  assert.strictEqual(insertBlocks[0], '![my photo](data:image/png;base64,AAAA)');
});

test('editor-io: non-image file in drop is ignored', async () => {
  const { editor, alerts, insertBlocks } = setup();
  const txtFile = { type: 'application/pdf', size: 100, name: 'doc.pdf' };
  editor.dispatchEvent({ type: 'drop', preventDefault() {}, dataTransfer: { files: [txtFile] } });
  await tick();
  assert.strictEqual(alerts.length, 0, 'no alert');
  assert.strictEqual(insertBlocks.length, 0, 'nothing inserted');
});

test('editor-io: export fallback chain reaches Blob download when no picker', async () => {
  const { editor, btnExport, blobs } = setup({ showSaveFilePicker: undefined });
  editor.value = '# Hello World';
  btnExport.dispatchEvent({ type: 'click' });
  await tick();
  assert.strictEqual(blobs.length, 1, 'one Blob created');
  assert.deepStrictEqual(blobs[0].parts, ['# Hello World']);
  assert.strictEqual(blobs[0].type, 'text/markdown');
});

test('editor-io: md-file drop replaces editor content', async () => {
  const { editor, confirms } = setup({ confirmResult: true });
  const mdFile = {
    name: 'notes.md', type: 'text/markdown', size: 20,
    text: async () => '# Imported Content',
  };
  editor.dispatchEvent({ type: 'drop', preventDefault() {}, dataTransfer: { files: [mdFile] } });
  await tick();
  assert.strictEqual(confirms.length, 1, 'confirm was asked');
  assert.strictEqual(editor.value, '# Imported Content');
});

test('editor-io: md-file drop with confirm=false does NOT replace', async () => {
  const { editor } = setup({ confirmResult: false });
  const mdFile = {
    name: 'notes.md', type: 'text/markdown', size: 20,
    text: async () => '# Should Not Appear',
  };
  editor.dispatchEvent({ type: 'drop', preventDefault() {}, dataTransfer: { files: [mdFile] } });
  await tick();
  assert.strictEqual(editor.value, 'initial content', 'editor unchanged');
});
