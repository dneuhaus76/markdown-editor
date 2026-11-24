// Markdown-Editor – GPL-3.0 (see LICENSE)
// Minimal Markdown parser (line-based, no dependencies).
// Supports: headings, bold/italic/strikethrough, inline code, fenced code blocks,
// links, images, unordered/ordered lists, tables, blockquotes, hr, paragraphs.

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Sanitize URL: positive list. Only http(s), mailto, data:image pass.
// Any other scheme (javascript:, vbscript:, file:) is neutralized to '#'.
// Relative paths (no scheme) are allowed.
function sanitizeUrl(url) {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|data:image\/)/i.test(trimmed)) return trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed; // relative path
  return '#'; // unsafe scheme → neutralize
}

// Inline formatting. Code spans run first so their content is not formatted.
function inline(text) {
  let out = escapeHtml(text);
  // Code spans are protected via placeholders so later rules do not format their content.
  const codes = [];
  out = out.replace(/`([^`]+)`/g, (_, c) => {
    codes.push('<code>' + c + '</code>');
    return '\x00' + (codes.length - 1) + '\x00';
  });
  // Whitelisted inline HTML (restored after escaping; code spans are already protected).
  out = out.replace(/&lt;u&gt;/g, '<u>').replace(/&lt;\/u&gt;/g, '</u>');
  out = out.replace(/&lt;br\s*\/\s*&gt;|&lt;br&gt;/g, '<br>');
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => '<img src="' + sanitizeUrl(url) + '" alt="' + alt + '">');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => '<a href="' + sanitizeUrl(url) + '" target="_blank" rel="noopener">' + text + '</a>');
  // Bold-italic first (***…*** / ___…___), then bold (**…** / __…), then italic.
  out = out.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  out = out.replace(/(^|[^A-Za-z0-9_*])___([^_]+)___/g, '$1<strong><em>$2</em></strong>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^A-Za-z0-9_*])__([^_]+)__(?![A-Za-z0-9])/g, '$1<strong>$2</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  // Underscore italic: only at a word boundary (no letter/digit before or after),
  // so identifiers like my_var_name stay untouched.
  out = out.replace(/(^|[^A-Za-z0-9_])_([^_\n]+)_(?![A-Za-z0-9])/g, '$1<em>$2</em>');
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  out = out.replace(/==([^=]+)==/g, '<mark>$1</mark>');
  // Sub/superscript: after ~~strikethrough~~ so single tildas do not collide.
  out = out.replace(/~([^~\s][^~]*)~/g, '<sub>$1</sub>');
  out = out.replace(/\^([^^\s][^^]*)\^/g, '<sup>$1</sup>');
  return out.replace(/\x00(\d+)\x00/g, (_, n) => codes[Number(n)]);
}

// Split a table row into cells; trims and drops empty outer cells from leading/trailing pipes.
function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

// Build nested lists from consecutive list lines (2 spaces or 1 tab per indent level).
function buildList(lines) {
  const lvl = (l) => l.match(/^\s*/)[0].replace(/\t/g, '  ').length >> 1;
  const base = Math.min.apply(null, lines.map(lvl));
  const tagOf = (l) => /^\s*\d+\.\s+/.test(l) ? 'ol' : 'ul';
  let html = '', cur = null, i = 0;
  const close = () => { if (cur) { html += '</' + cur + '>'; cur = null; } };
  while (i < lines.length) {
    const line = lines[i];
    if (i > 0 && lvl(line) > base) { i++; continue; } // orphan deep line – skip
    const tag = tagOf(line);
    if (cur !== tag) { close(); html += '<' + tag + '>'; cur = tag; }
    const content = line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '');
    i++;
    const nested = [];
    while (i < lines.length && lvl(lines[i]) > base) nested.push(lines[i++]);
    // Task list: - [ ] open / - [x] done (checkbox is clickable in the preview)
    const task = content.match(/^\[([ xX])\]\s+(.*)$/);
    const li = task
      ? '<li class="task"><input type="checkbox" data-task' + (/^[xX]$/.test(task[1]) ? ' checked' : '') + '> ' + inline(task[2])
      : '<li>' + inline(content);
    html += li + (nested.length ? buildList(nested) : '') + '</li>';
  }
  close();
  return html;
}

function parse(md) {
  if (typeof md !== 'string') throw new TypeError('markdown: input must be a string');
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block (language tag: mermaid → diagram, else plain code)
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim().toLowerCase();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; // skip closing fence (or EOF)
      if (lang === 'mermaid') {
        out.push('<div class="mermaid">\n' + escapeHtml(buf.join('\n')) + '\n</div>');
      } else {
        out.push('<pre><code>' + escapeHtml(buf.join('\n')) + '</code></pre>');
      }
      continue;
    }

    // Heading (optional anchor ID: ### Title {#custom-id})
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      let text = h[2];
      let id = '';
      const idm = text.match(/\s*\{#([A-Za-z0-9_-]+)\}\s*$/);
      if (idm) { id = idm[1]; text = text.slice(0, text.length - idm[0].length); }
      out.push('<h' + h[1].length + (id ? ' id="' + id + '"' : '') + '>' + inline(text) + '</h' + h[1].length + '>');
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // Page break (block-level HTML, whitelisted; own line)
    if (/^\s*<div\s+class="page-break">\s*<\/div>\s*$/.test(line)) {
      out.push('<div class="page-break"></div>');
      i++;
      continue;
    }

    // Blockquote (recursive)
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push('<blockquote>' + parse(buf.join('\n')) + '</blockquote>');
      continue;
    }

    // Table: header row followed by a separator row
    if (line.includes('|') && i + 1 < lines.length &&
        /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const header = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i++]));
      }
      let t = '<table><thead><tr>';
      for (const c of header) t += '<th>' + inline(c) + '</th>';
      t += '</tr></thead><tbody>';
      for (const r of rows) {
        t += '<tr>';
        for (const c of r) t += '<td>' + inline(c) + '</td>';
        t += '</tr>';
      }
      t += '</tbody></table>';
      out.push(t);
      continue;
    }

    // Lists (unordered / ordered), nested via indentation
    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i++]);
      }
      out.push(buildList(items));
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph: collect until blank line or next block start
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' &&
           !/^(#{1,6}\s|```|>\s?|\s*[-*+]\s|\s*\d+\.\s|\s*(---+|\*\*\*+)\s*$|<div\s+class="page-break")/.test(lines[i])) {
      buf.push(lines[i++]);
    }
    out.push('<p>' + inline(buf.join(' ')) + '</p>');
  }

  return out.join('\n');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parse, inline, escapeHtml };
} else {
  window.Markdown = { parse, inline };
}
