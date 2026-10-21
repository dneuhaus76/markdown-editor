// App logic: live preview, toolbar actions, autosave, import/export.
(function () {
  'use strict';

  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const fileInput = document.getElementById('file-input');
  const STORAGE_KEY = 'md-editor-content';

  // ---------- Live preview (debounced) ----------
  function render() {
    preview.innerHTML = Markdown.parse(editor.value);
  }
  let renderTimer = null;
  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 150);
  }

  // ---------- Autosave (debounced) ----------
  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, editor.value); }
      catch (e) { /* storage full or private mode – non-fatal */ }
    }, 500);
  }

  editor.addEventListener('input', () => { scheduleRender(); scheduleSave(); });

  // ---------- Toolbar helpers ----------
  // Toggle wrap: if the selection is already wrapped with the same markers,
  // remove them; otherwise wrap it.
  function wrapSelection(before, after, placeholder) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const val = editor.value;
    const sel = val.slice(start, end);

    // Already wrapped (optionally with surrounding whitespace)? -> unwrap.
    if (sel.length >= before.length + after.length) {
      let core = sel;
      let pad = 0;
      if (core.startsWith(before) && core.endsWith(after)) {
        core = core.slice(before.length, core.length - after.length);
      } else {
        // allow " **text** " style: find markers just inside the selection
        const m = core.match(new RegExp('^\\s*' + escapeRe(before) + '(.*)' + escapeRe(after) + '\\s*$'));
        if (m) { core = m[1]; pad = 1; }
      }
      if (core !== sel) {
        editor.setRangeText(core, start + pad, end - pad, 'select');
        editor.focus();
        scheduleRender(); scheduleSave();
        return;
      }
    }

    const text = sel || placeholder;
    editor.setRangeText(before + text + after, start, end, 'select');
    editor.focus();
    scheduleRender(); scheduleSave();
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Toggle a line prefix (headings, list markers).
  // Same prefix on all lines -> remove; different prefix of the same kind -> replace.
  function prefixLines(prefix) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const val = editor.value;
    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = val.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = val.length;
    const lines = val.slice(lineStart, lineEnd).split('\n');
    const prefixRe = /^(#{1,6}\s+|[-*+]\s+|\d+\.\s+)/;

    const allHave = lines.every(l => l.startsWith(prefix));
    const transformed = lines.map(l => {
      if (l.startsWith(prefix)) return l.slice(prefix.length); // toggle off
      const m = l.match(prefixRe);
      if (m) return prefix + l.slice(m[0].length);            // replace same-kind prefix
      return prefix + l;                                       // add
    });

    editor.setRangeText(transformed.join('\n'), lineStart, lineEnd, 'end');
    editor.focus();
    scheduleRender(); scheduleSave();
  }

  // Indent (dir = +1) or outdent (dir = -1) the selected lines by 2 spaces.
  function indentLines(dir) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const val = editor.value;
    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = val.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = val.length;
    const transformed = val.slice(lineStart, lineEnd).split('\n')
      .map(l => (dir > 0 ? '  ' + l : l.replace(/^ {1,2}/, ''))).join('\n');
    editor.setRangeText(transformed, lineStart, lineEnd, 'end');
    editor.focus();
    scheduleRender(); scheduleSave();
  }

  function insertBlock(text) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.setRangeText(text, start, end, 'end');
    editor.focus();
    scheduleRender(); scheduleSave();
  }

  const TABLE_TEMPLATE =
    '| Spalte 1 | Spalte 2 | Spalte 3 |\n' +
    '|----------|----------|----------|\n' +
    '| Text     | Text     | Text     |\n';

  const actions = {
    bold:      () => wrapSelection('**', '**', 'fett'),
    italic:    () => wrapSelection('*', '*', 'kursiv'),
    strike:    () => wrapSelection('~~', '~~', 'durchgestrichen'),
    underline: () => wrapSelection('<u>', '</u>', 'unterstrichen'),
    br:        () => insertBlock('<br>'),
    code:      () => wrapSelection('`', '`', 'code'),
    codeblock: () => insertBlock('```\ncode\n```\n'),
    hr:        () => insertBlock('\n---\n'),
    h1:        () => prefixLines('# '),
    h2:        () => prefixLines('## '),
    h3:        () => prefixLines('### '),
    ul:        () => prefixLines('- '),
    indent:    () => indentLines(1),
    outdent:   () => indentLines(-1),
    quote:     () => prefixLines('> '),
    table:     () => insertBlock(TABLE_TEMPLATE),
    link:      () => wrapSelection('[', '](https://)', 'Linktext'),
    image:     () => wrapSelection('![', '](https://)', 'Alttext'),
  };

  document.querySelector('.toolbar').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const fn = actions[btn.dataset.action];
    if (fn) fn();
  });

  // Keyboard shortcuts: Ctrl/Cmd+B, Ctrl/Cmd+I
  editor.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); actions.bold(); }
    if (k === 'i') { e.preventDefault(); actions.italic(); }
    if (k === 'k') { e.preventDefault(); actions.link(); }
  });

  // ---------- Import / Export ----------
  document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([editor.value], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dokument.md';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.value = String(reader.result);
      render(); scheduleSave();
    };
    reader.onerror = () => alert('Datei konnte nicht gelesen werden: ' + file.name);
    reader.readAsText(file);
    fileInput.value = '';
  });

  // ---------- Sync scrolling (editor <-> preview) ----------
  // Proportional mapping; echo events (caused by our own scrollTop write) are
  // detected because the target is already at the computed position.
  function syncScroll(src, dst) {
    const max = src.scrollHeight - src.clientHeight;
    if (max <= 0) return;
    const ratio = src.scrollTop / max;
    const target = Math.round(ratio * (dst.scrollHeight - dst.clientHeight));
    if (Math.abs(dst.scrollTop - target) <= 1) return; // echo – ignore
    dst.scrollTop = target;
  }
  editor.addEventListener('scroll', () => syncScroll(editor, preview));
  preview.addEventListener('scroll', () => syncScroll(preview, editor));

  // ---------- Splitter (resizable panes) ----------
  const panes = document.querySelector('.panes');
  const splitter = document.getElementById('splitter');
  const SPLIT_KEY = 'md-editor-split';
  function setSplit(pct) {
    pct = Math.min(80, Math.max(20, pct));
    panes.style.setProperty('--split', pct + '%');
    try { localStorage.setItem(SPLIT_KEY, String(pct)); } catch (e) { /* non-fatal */ }
  }
  let dragging = false;
  splitter.addEventListener('pointerdown', (e) => {
    dragging = true;
    splitter.classList.add('dragging');
    splitter.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  splitter.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = panes.getBoundingClientRect();
    setSplit(((e.clientX - rect.left) / rect.width) * 100);
  });
  splitter.addEventListener('pointerup', () => {
    dragging = false;
    splitter.classList.remove('dragging');
  });
  splitter.addEventListener('dblclick', () => setSplit(50));
  try {
    const savedSplit = parseFloat(localStorage.getItem(SPLIT_KEY));
    if (savedSplit) setSplit(savedSplit);
  } catch (e) { /* storage unavailable */ }

  // ---------- Help / About modal ----------
  const helpOverlay = document.getElementById('help-overlay');
  document.getElementById('btn-help').addEventListener('click', () => {
    helpOverlay.hidden = false;
  });
  function closeHelp() { helpOverlay.hidden = true; }
  document.getElementById('help-close').addEventListener('click', closeHelp);
  helpOverlay.addEventListener('click', (e) => {
    if (e.target === helpOverlay) closeHelp();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !helpOverlay.hidden) closeHelp();
  });

  // ---------- Mobile view toggle ----------
  if (window.matchMedia('(max-width: 768px)').matches) {
    document.body.dataset.view = 'editor';
    document.querySelectorAll('.pane-label').forEach((el) => {
      el.addEventListener('click', () => {
        const next = el.dataset.label === 'editor' ? 'preview' : 'editor';
        document.body.dataset.view = next;
        if (next === 'preview') render();
      });
    });
  }

  // ---------- Init ----------
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) editor.value = saved;
  } catch (e) { /* storage unavailable – start empty */ }
  render();
})();
