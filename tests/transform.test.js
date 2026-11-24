// Markdown-Editor – GPL-3.0 (see LICENSE)
// Unit tests for the pure toolbar transformations (run: node --test tests/)
const { test } = require('node:test');
const assert = require('node:assert');
const T = require('../js/transform.js');

// Helper: select the whole value.
function all(v) { return { value: v, start: 0, end: v.length }; }

test('wrapSelection: insert markers around selection', () => {
  const r = T.wrapSelection('hello world', 0, 5, '**', '**', 'bold');
  assert.strictEqual(r.value, '**hello** world');
  assert.strictEqual(r.selStart, 2);
  assert.strictEqual(r.selEnd, 7);
});

test('wrapSelection: empty selection on a word wraps the whole word', () => {
  // Cursor inside "abc" (pos 1) → expands to the full word.
  const r = T.wrapSelection('abc', 1, 1, '**', '**', 'bold');
  assert.strictEqual(r.value, '**abc**');
  assert.strictEqual(r.selStart, 2);
  assert.strictEqual(r.selEnd, 5);
});

test('wrapSelection: empty selection on blank inserts markers only', () => {
  // Cursor between two spaces (pos 2 in 'a  b') → no word to expand, insert empty markers.
  const r = T.wrapSelection('a  b', 2, 2, '**', '**', 'bold');
  assert.strictEqual(r.value, 'a **** b');
});

test('wrapSelection: unwrap already-wrapped selection', () => {
  const r = T.wrapSelection('**hello** world', 0, 9, '**', '**', 'bold');
  assert.strictEqual(r.value, 'hello world');
});

test('wrapSelection: toggle off when markers are adjacent (only core marked)', () => {
  // "**hello**" with only "hello" selected -> unwrap.
  const r = T.wrapSelection('**hello**', 2, 7, '**', '**', 'bold');
  assert.strictEqual(r.value, 'hello');
});

test('wrapSelection: conflict replacement (sub over sup)', () => {
  // Selection is ^sup^, click sub (~ ~) with conflict {before:'^',after:'^'} -> replace.
  const r = T.wrapSelection('^x^', 0, 3, '~', '~', 'sub', { before: '^', after: '^' });
  assert.strictEqual(r.value, '~x~');
});

test('wrapSelection: conflict adjacent replacement', () => {
  // "^x^" with only "x" marked, click sub -> replace pair.
  const r = T.wrapSelection('^x^', 1, 2, '~', '~', 'sub', { before: '^', after: '^' });
  assert.strictEqual(r.value, '~x~');
});

test('prefixLines: add heading to plain line', () => {
  const r = T.prefixLines('title\nbody', 0, 5, '# ');
  assert.strictEqual(r.value, '# title\nbody');
});

test('prefixLines: toggle off when all lines have the prefix', () => {
  const r = T.prefixLines('# title\n# sub', 0, 17, '# ');
  assert.strictEqual(r.value, 'title\nsub');
});

test('prefixLines: replace same-kind prefix (h1 -> h2)', () => {
  const r = T.prefixLines('# title', 0, 7, '## ');
  assert.strictEqual(r.value, '## title');
});

test('indentLines: indent adds 2 spaces per line', () => {
  const r = T.indentLines('a\nb', 0, 3, 1);
  assert.strictEqual(r.value, '  a\n  b');
});

test('indentLines: outdent removes up to 2 spaces', () => {
  const r = T.indentLines('  a\n  b', 0, 7, -1);
  assert.strictEqual(r.value, 'a\nb');
});

test('toggleTaskLines: add checkbox to plain list line', () => {
  const r = T.toggleTaskLines('- task', 0, 6);
  assert.strictEqual(r.value, '- [ ] task');
});

test('toggleTaskLines: remove existing checkbox (keeps list marker)', () => {
  const r = T.toggleTaskLines('- [ ] task', 0, 11);
  assert.strictEqual(r.value, '- task');
});

test('codeblockTransform: strip fences from fenced selection', () => {
  const r = T.codeblockTransform('```\ncode\n```', 0, 13);
  assert.strictEqual(r.value, 'code');
});

test('codeblockTransform: returns null when not fenced', () => {
  const r = T.codeblockTransform('plain text', 0, 10);
  assert.strictEqual(r, null);
});

test('escapeRe: escapes regex metacharacters', () => {
  assert.strictEqual(T.escapeRe('a.b*c'), 'a\\.b\\*c');
});

// BUG regression: selecting a word inside an already-formatted span (with
// non-marker text in the gap) must NOT nest the same format again.
test('wrapSelection: no nesting when selection is inside same-format pair (bold, gap text)', () => {
  const v = '**hello world**';
  const s = v.indexOf('world');
  const r = T.wrapSelection(v, s, s + 5, '**', '**', 'bold');
  assert.strictEqual(r.value, '**hello world**');
});

test('wrapSelection: no nesting when selection is inside same-format pair (underline, gap text)', () => {
  const v = '<u>hello world</u>';
  const s = v.indexOf('world');
  const r = T.wrapSelection(v, s, s + 5, '<u>', '</u>', 'underlined');
  assert.strictEqual(r.value, '<u>hello world</u>');
});

test('wrapSelection: no nesting when selection is inside same-format pair (highlight, gap text)', () => {
  const v = '==hello world==';
  const s = v.indexOf('world');
  const r = T.wrapSelection(v, s, s + 5, '==', '==', 'highlight');
  assert.strictEqual(r.value, '==hello world==');
});

test('wrapSelection: no nesting when selection is inside same-format pair (strike, gap text)', () => {
  const v = '~~hello world~~';
  const s = v.indexOf('world');
  const r = T.wrapSelection(v, s, s + 5, '~~', '~~', 'strikethrough');
  assert.strictEqual(r.value, '~~hello world~~');
});

test('wrapSelection: no nesting when selection is inside same-format pair (italic, gap text)', () => {
  const v = '_hello world_';
  const s = v.indexOf('world');
  const r = T.wrapSelection(v, s, s + 5, '_', '_', 'italic');
  assert.strictEqual(r.value, '_hello world_');
});

// Legit cases must keep working:
test('wrapSelection: fresh wrap on plain text still works', () => {
  const v = 'plain text';
  const s = v.indexOf('text');
  const r = T.wrapSelection(v, s, s + 4, '**', '**', 'bold');
  assert.strictEqual(r.value, 'plain **text**');
});

test('wrapSelection: unwrap outer bold in nested formats still works', () => {
  const v = '**_hello_**';
  const s = v.indexOf('hello');
  const r = T.wrapSelection(v, s, s + 5, '**', '**', 'bold');
  assert.strictEqual(r.value, '_hello_');
});

test('wrapSelection: applying different format inside same-format pair still works', () => {
  // Inside bold, apply italic -> should wrap with italic (different format)
  const v = '**hello world**';
  const s = v.indexOf('world');
  const r = T.wrapSelection(v, s, s + 5, '_', '_', 'italic');
  assert.strictEqual(r.value, '**hello _world_**');
});

test('wrapSelection: two adjacent bold pairs, select word in second pair with gap -> no nesting', () => {
  // "**a** and **hello b**", select "b" → gap "hello " between "b" and opening **
  // isInsideSamePair catches it (count of ** before "b" = 3, odd) → unchanged
  const v = '**a** and **hello b**';
  const s = v.lastIndexOf('b');
  const r = T.wrapSelection(v, s, s + 1, '**', '**', 'bold');
  assert.strictEqual(r.value, '**a** and **hello b**');
});

test('wrapSelection: partial selection inside bold pair -> no nesting', () => {
  const v = '**hello world**';
  const s = v.indexOf('worl'); // partial: "worl" not "world"
  const r = T.wrapSelection(v, s, s + 4, '**', '**', 'bold');
  assert.strictEqual(r.value, '**hello world**');
});
