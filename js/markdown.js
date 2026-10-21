// Minimal Markdown parser (line-based, no dependencies).
// Supports: headings, bold/italic/strikethrough, inline code, fenced code blocks,
// links, images, unordered/ordered lists, tables, blockquotes, hr, paragraphs.

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
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
    html += '<li>' + inline(content) + (nested.length ? buildList(nested) : '') + '</li>';
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

    // Fenced code block
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; // skip closing fence (or EOF)
      out.push('<pre><code>' + escapeHtml(buf.join('\n')) + '</code></pre>');
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      out.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>');
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      out.push('<hr>');
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
           !/^(#{1,6}\s|```|>\s?|\s*[-*+]\s|\s*\d+\.\s|\s*(---+|\*\*\*+)\s*$)/.test(lines[i])) {
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
