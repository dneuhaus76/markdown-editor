// Markdown-Editor – GPL-3.0 (see LICENSE)
// Unit tests for the minimal Markdown parser (run: node --test tests/)
const { test } = require('node:test');
const assert = require('node:assert');
const { parse, inline } = require('../js/markdown.js');

test('headings h1-h3', () => {
  assert.strictEqual(parse('# Title'), '<h1>Title</h1>');
  assert.strictEqual(parse('## Sub'), '<h2>Sub</h2>');
  assert.strictEqual(parse('### Subsub'), '<h3>Subsub</h3>');
});

test('bold / italic / strikethrough', () => {
  assert.strictEqual(inline('**bold**'), '<strong>bold</strong>');
  assert.strictEqual(inline('*italic*'), '<em>italic</em>');
  assert.strictEqual(inline('~~gone~~'), '<del>gone</del>');
});

test('inline code is not formatted inside', () => {
  assert.strictEqual(inline('`**code**`'), '<code>**code**</code>');
});

test('html escaping', () => {
  assert.strictEqual(inline('<b>&"x"</b>'), '&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;');
});

test('whitelisted inline html: underline', () => {
  assert.strictEqual(inline('<u>Text</u>'), '<u>Text</u>');
  assert.strictEqual(parse('before <u>bold **and**</u> after'), '<p>before <u>bold <strong>and</strong></u> after</p>');
  assert.strictEqual(parse('- <u>a</u>'), '<ul><li><u>a</u></li></ul>');
});

test('whitelisted inline html: br', () => {
  assert.strictEqual(inline('Line 1<br>Line 2'), 'Line 1<br>Line 2');
  assert.strictEqual(inline('a<br/>b'), 'a<br>b');
  assert.strictEqual(parse('Line 1<br>Line 2'), '<p>Line 1<br>Line 2</p>');
});

test('whitelist does not leak into code spans', () => {
  assert.strictEqual(inline('`<u>`'), '<code>&lt;u&gt;</code>');
  assert.strictEqual(parse('```\n<u>x</u>\n```'), '<pre><code>&lt;u&gt;x&lt;/u&gt;</code></pre>');
});

test('highlight ==text==', () => {
  assert.strictEqual(inline('==important=='), '<mark>important</mark>');
  assert.strictEqual(
    parse('This is ==very important== here.'),
    '<p>This is <mark>very important</mark> here.</p>'
  );
});

test('subscript ~x~ (not confused with ~~strikethrough~~)', () => {
  assert.strictEqual(inline('H~2~O'), 'H<sub>2</sub>O');
  assert.strictEqual(inline('~~gone~~'), '<del>gone</del>');
  assert.strictEqual(inline('a ~ b ~ c'), 'a ~ b ~ c'); // space = no subscript
});

test('superscript ^x^', () => {
  assert.strictEqual(inline('X^2^'), 'X<sup>2</sup>');
  assert.strictEqual(inline('m^2^/s^2^'), 'm<sup>2</sup>/s<sup>2</sup>');
});

test('heading id {#custom-id}', () => {
  assert.strictEqual(
    parse('### My Great Heading {#custom-id}'),
    '<h3 id="custom-id">My Great Heading</h3>'
  );
  assert.strictEqual(parse('## No Id'), '<h2>No Id</h2>');
  assert.strictEqual(parse('# Wrong { id }'), '<h1>Wrong { id }</h1>'); // no valid ID
});

test('task list', () => {
  assert.strictEqual(
    parse('- [ ] open\n- [x] done'),
    '<ul>' +
    '<li class="task"><input type="checkbox" data-task> open</li>' +
    '<li class="task"><input type="checkbox" data-task checked> done</li>' +
    '</ul>'
  );
  assert.strictEqual(parse('- plain'), '<ul><li>plain</li></ul>');
});

test('link and image', () => {
  assert.strictEqual(
    inline('[Text](https://ex.ch)'),
    '<a href="https://ex.ch" target="_blank" rel="noopener">Text</a>'
  );
  assert.strictEqual(inline('![Alt](img.png)'), '<img src="img.png" alt="Alt">');
});

test('fenced code block', () => {
  assert.strictEqual(parse('```\na < b\n```'), '<pre><code>a &lt; b</code></pre>');
});

test('unordered and ordered lists', () => {
  assert.strictEqual(parse('- a\n- b'), '<ul><li>a</li><li>b</li></ul>');
  assert.strictEqual(parse('1. a\n2. b'), '<ol><li>a</li><li>b</li></ol>');
});

test('nested lists via indentation', () => {
  assert.strictEqual(
    parse('- a\n  - b'),
    '<ul><li>a<ul><li>b</li></ul></li></ul>'
  );
  assert.strictEqual(
    parse('- a\n- b\n  - c'),
    '<ul><li>a</li><li>b<ul><li>c</li></ul></li></ul>'
  );
  assert.strictEqual(
    parse('1. a\n   1. b'),
    '<ol><li>a<ol><li>b</li></ol></li></ol>'
  );
  assert.strictEqual(
    parse('- a\n  - b\n    - c\n  - d'),
    '<ul><li>a<ul><li>b<ul><li>c</li></ul></li><li>d</li></ul></li></ul>'
  );
});

test('table', () => {
  const md = '| A | B |\n|---|---|\n| 1 | 2 |';
  const html = parse(md);
  assert.match(html, /<table><thead><tr><th>A<\/th><th>B<\/th><\/tr><\/thead>/);
  assert.match(html, /<tbody><tr><td>1<\/td><td>2<\/td><\/tr><\/tbody><\/table>/);
});

test('blockquote', () => {
  assert.strictEqual(parse('> Quote'), '<blockquote><p>Quote</p></blockquote>');
});

test('horizontal rule', () => {
  assert.strictEqual(parse('---'), '<hr>');
});

test('page break (block-level HTML, whitelisted)', () => {
  assert.strictEqual(
    parse('<div class="page-break"></div>'),
    '<div class="page-break"></div>'
  );
  assert.strictEqual(
    parse('Page 1\n\n<div class="page-break"></div>\n\nPage 2'),
    '<p>Page 1</p>\n<div class="page-break"></div>\n<p>Page 2</p>'
  );
  // breaks a running paragraph
  assert.strictEqual(
    parse('Text\n<div class="page-break"></div>\nMehr'),
    '<p>Text</p>\n<div class="page-break"></div>\n<p>Mehr</p>'
  );
  // stays escaped in code block
  assert.strictEqual(
    parse('```\n<div class="page-break"></div>\n```'),
    '<pre><code>&lt;div class=&quot;page-break&quot;&gt;&lt;/div&gt;</code></pre>'
  );
});

test('paragraph joins lines', () => {
  assert.strictEqual(parse('line1\nline2'), '<p>line1 line2</p>');
});

test('empty input', () => {
  assert.strictEqual(parse(''), '');
});

test('non-string input throws', () => {
  assert.throws(() => parse(null), TypeError);
  assert.throws(() => parse(42), TypeError);
});

test('XSS: javascript: URLs are neutralized', () => {
  assert.strictEqual(
    inline('[klick](javascript:evil)'),
    '<a href="#" target="_blank" rel="noopener">klick</a>'
  );
  assert.strictEqual(
    inline('![x](javascript:steal)'),
    '<img src="#" alt="x">'
  );
});

test('XSS: safe URLs pass through', () => {
  assert.strictEqual(
    inline('[Text](https://ex.ch)'),
    '<a href="https://ex.ch" target="_blank" rel="noopener">Text</a>'
  );
  assert.strictEqual(
    inline('![Alt](img.png)'),
    '<img src="img.png" alt="Alt">'
  );
  assert.strictEqual(
    inline('[Mail](mailto:hi@ex.ch)'),
    '<a href="mailto:hi@ex.ch" target="_blank" rel="noopener">Mail</a>'
  );
});

test('underscore bold __text__ (alt syntax)', () => {
  assert.strictEqual(inline('__bold__'), '<strong>bold</strong>');
  assert.strictEqual(inline('__a__ __b__'), '<strong>a</strong> <strong>b</strong>');
});

test('underscore italic _text_ (alt syntax)', () => {
  assert.strictEqual(inline('_italic_'), '<em>italic</em>');
  assert.strictEqual(inline('_i_ _j_'), '<em>i</em> <em>j</em>');
});

test('bold-italic ***x*** and ___x___', () => {
  assert.strictEqual(inline('***bold italic***'), '<strong><em>bold italic</em></strong>');
  assert.strictEqual(inline('___bold italic___'), '<strong><em>bold italic</em></strong>');
});

test('underscore does not match inside identifiers', () => {
  assert.strictEqual(inline('my_var_name stays'), 'my_var_name stays');
  assert.strictEqual(inline('a_b_c'), 'a_b_c');
  assert.strictEqual(inline('word__x__end'), 'word__x__end');
});

test('mixed alt syntax in one paragraph', () => {
  assert.strictEqual(
    inline('_italic_ und **bold**'),
    '<em>italic</em> und <strong>bold</strong>'
  );
  assert.strictEqual(
    inline('***bold italic*** und **extra bold**'),
    '<strong><em>bold italic</em></strong> und <strong>extra bold</strong>'
  );
});

test('list markers - * + are equivalent', () => {
  assert.strictEqual(parse('- a\n* b\n+ c'), '<ul><li>a</li><li>b</li><li>c</li></ul>');
  assert.strictEqual(
    parse('- [ ] task\n* item2'),
    '<ul><li class="task"><input type="checkbox" data-task> task</li><li>item2</li></ul>'
  );
});

test('sanitizeUrl: data:text/html is neutralized', () => {
  assert.strictEqual(
    inline('[x](data:text/html;base64,PHNjcmlwdD4=)'),
    '<a href="#" target="_blank" rel="noopener">x</a>'
  );
});

test('sanitizeUrl: protocol-relative URLs pass (relative path)', () => {
  assert.strictEqual(
    inline('[x](//cdn.example.com/file.js)'),
    '<a href="//cdn.example.com/file.js" target="_blank" rel="noopener">x</a>'
  );
});

test('table cells support inline formatting', () => {
  const md = '| **Bold** | *italic* |\n|---|---|\n| `code` | ~~gone~~ |';
  const html = parse(md);
  assert.match(html, /<th><strong>Bold<\/strong><\/th>/);
  assert.match(html, /<th><em>italic<\/em><\/th>/);
  assert.match(html, /<td><code>code<\/code><\/td>/);
  assert.match(html, /<td><del>gone<\/del><\/td>/);
});

test('blockquote with nested list', () => {
  const html = parse('> - item1\n> - item2');
  assert.match(html, /<blockquote><ul><li>item1<\/li><li>item2<\/li><\/ul><\/blockquote>/);
});
