// Markdown-Editor – GPL-3.0 (see LICENSE)
// App logic: live preview, toolbar actions, autosave, import/export.
(function () {
  'use strict';

  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const fileInput = document.getElementById('file-input');
  const STORAGE_KEY = 'md-editor-content';

  // ---------- Live preview (debounced) ----------
  let a4On = false;
  // A4 pagination: blocks are measured and distributed across pages as they
  // would break when printing/PDF export (297 mm minus 2x20 mm padding).
  const MM = 96 / 25.4; // px pro mm
  function paginateA4(html) {
    const sheet = document.createElement('div');
    sheet.className = 'a4-sheet a4-measure';
    sheet.innerHTML = html;
    preview.appendChild(sheet);
    const cs = getComputedStyle(sheet);
    const budget = 297 * MM - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const pages = [];
    let cur = [], used = 0;
    for (const el of sheet.children) {
      if (el.classList.contains('page-break')) {
        if (cur.length) { pages.push(cur); cur = []; used = 0; } // forced break
        continue; // the break line itself takes no space
      }
      const s = getComputedStyle(el);
      const h = el.getBoundingClientRect().height + parseFloat(s.marginTop) + parseFloat(s.marginBottom);
      if (used + h > budget && cur.length) { pages.push(cur); cur = []; used = 0; }
      cur.push(el);
      used += h;
    }
    pages.push(cur);
    sheet.remove();
    if (!pages.length) pages.push([]);
    return pages.map(p => '<div class="a4-sheet">' + p.map(el => el.outerHTML).join('') + '</div>').join('\n');
  }
  function render() {
    const html = Markdown.parse(editor.value);
    preview.innerHTML = a4On ? paginateA4(html) : html;
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

  // ---------- Undo (Ctrl/Cmd+Z) ----------
  // Simple snapshot stack: setRangeText (toolbar actions) does not reach the
  // native browser undo history, so it is managed separately here.
  const undoStack = [];
  function pushUndo() {
    undoStack.push({ value: editor.value, start: editor.selectionStart, end: editor.selectionEnd });
    if (undoStack.length > 100) undoStack.shift();
  }
  function undo() {
    const s = undoStack.pop();
    if (!s) return;
    editor.value = s.value;
    editor.setSelectionRange(s.start, s.end);
    scheduleRender(); scheduleSave();
  }
  editor.addEventListener('beforeinput', pushUndo); // typing/pasting/deleting

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
        pushUndo();
        editor.setRangeText(core, start + pad, end - pad, 'select');
        editor.focus();
        scheduleRender(); scheduleSave();
        return;
      }
    }

    // Markers directly adjacent to the selection (e.g. **bold** with only "bold" marked)
    // -> toggle off instead of doubling to ****bold****.
    if (val.slice(start - before.length, start) === before &&
        val.slice(end, end + after.length) === after) {
      pushUndo();
      editor.setRangeText(sel, start - before.length, end + after.length, 'select');
      editor.focus();
      scheduleRender(); scheduleSave();
      return;
    }

    const text = sel || placeholder;
    pushUndo();
    // Select only the content (without markers) - otherwise the next keystroke replaces everything.
    editor.setRangeText(before + text + after, start, end, 'end');
    editor.setSelectionRange(start + before.length, start + before.length + text.length);
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

    pushUndo();
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
    pushUndo();
    const transformed = val.slice(lineStart, lineEnd).split('\n')
      .map(l => (dir > 0 ? '  ' + l : l.replace(/^ {1,2}/, ''))).join('\n');
    editor.setRangeText(transformed, lineStart, lineEnd, 'end');
    editor.focus();
    scheduleRender(); scheduleSave();
  }

  // Code block: selected text is wrapped in fences (not replaced);
  // already fenced selection = toggle off; no selection = template.
  function codeblockAction() {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const sel = editor.value.slice(start, end);
    const t = sel.match(/^```\n?([\s\S]*?)\n?```\s*$/);
    if (t) {
      pushUndo();
      editor.setRangeText(t[1], start, end, 'select');
      editor.focus();
      scheduleRender(); scheduleSave();
      return;
    }
    insertBlock('```\n' + (sel || 'code') + '\n```\n');
  }

  function insertBlock(text) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    pushUndo();
    editor.setRangeText(text, start, end, 'end');
    editor.focus();
    scheduleRender(); scheduleSave();
  }

  // Task list: toggle the checkbox after the list marker.
  function toggleTaskLines() {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const val = editor.value;
    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = val.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = val.length;
    const markerRe = /^\s*(?:[-*+]|\d+\.)\s+/;
    pushUndo();
    const transformed = val.slice(lineStart, lineEnd).split('\n').map(l => {
      const t = l.match(new RegExp(markerRe.source + '\\[[ xX]\\]\\s+'));
      if (t) return l.slice(t[0].length); // remove checkbox
      const m = l.match(markerRe);
      if (m) return l.slice(0, m[0].length) + '[ ] ' + l.slice(m[0].length); // insert checkbox
      return '- [ ] ' + l; // new task line
    });
    editor.setRangeText(transformed.join('\n'), lineStart, lineEnd, 'end');
    editor.focus();
    scheduleRender(); scheduleSave();
  }

  const TABLE_TEMPLATE =
    '| Column 1 | Column 2 | Column 3 |\n' +
    '|----------|----------|----------|\n' +
    '| Text     | Text     | Text     |\n';

  const actions = {
    bold:      () => wrapSelection('**', '**', 'bold'),
    italic:    () => wrapSelection('*', '*', 'italic'),
    strike:    () => wrapSelection('~~', '~~', 'strikethrough'),
    underline: () => wrapSelection('<u>', '</u>', 'underlined'),
    br:        () => insertBlock('<br>'),
    code:      () => wrapSelection('`', '`', 'code'),
    codeblock: codeblockAction,
    clear:     () => {
      if (!editor.value) return;
      if (!confirm('Clear document? (Ctrl+Z = Undo)')) return;
      pushUndo();
      editor.value = '';
      editor.focus();
      scheduleRender(); scheduleSave();
    },
    pagebreak: () => insertBlock('\n<div class="page-break"></div>\n'),
    highlight: () => wrapSelection('==', '==', 'highlight'),
    sub:       () => wrapSelection('~', '~', 'sub'),
    sup:       () => wrapSelection('^', '^', 'sup'),
    task:      () => toggleTaskLines(),
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

  // Prevent mousedown: otherwise the button steals focus and the editor
  // selection is lost (especially on mobile) - the placeholder would then be
  // inserted instead of the marked text.
  document.querySelector('.toolbar').addEventListener('mousedown', (e) => {
    if (e.target.closest('button[data-action]')) e.preventDefault();
  });
  document.querySelector('.toolbar').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const fn = actions[btn.dataset.action];
    if (fn) fn();
  });

  // Task list: checkbox in the preview toggles [ ] / [x] in the editor.
  preview.addEventListener('change', (e) => {
    const cb = e.target.closest('input[data-task]');
    if (!cb) return;
    const index = Array.from(preview.querySelectorAll('input[data-task]')).indexOf(cb);
    const re = /^\s*(?:>\s*)*(?:[-*+]|\d+\.)\s+\[[ xX]\]\s+/;
    const lines = editor.value.split('\n');
    let k = -1;
    for (let i = 0; i < lines.length; i++) {
      if (!re.test(lines[i])) continue;
      k++;
      if (k === index) {
        pushUndo();
        lines[i] = lines[i].replace(/\[[ xX]\]/, cb.checked ? '[x]' : '[ ]');
        editor.value = lines.join('\n');
        scheduleRender(); scheduleSave();
        return;
      }
    }
  });

  // Keyboard shortcuts: Ctrl/Cmd+B, Ctrl/Cmd+I
  editor.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); actions.bold(); }
    if (k === 'i') { e.preventDefault(); actions.italic(); }
    if (k === 'k') { e.preventDefault(); actions.link(); }
    if (k === 'z' && !e.shiftKey && undoStack.length) { e.preventDefault(); undo(); }
  });

  // ---------- Import / Export (File System Access API, Fallback Download) ----------
  // Handle of the open file: when present, export saves directly in place.
  let fileHandle = null;
  let fileName = 'document.md';
  const MD_TYPES = [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }];

  function flashExport(msg) {
    const btn = document.getElementById('btn-export');
    const old = btn.textContent;
    btn.textContent = '\u2713';
    btn.title = msg;
    setTimeout(() => { btn.textContent = old; btn.title = 'Save as .md'; }, 1500);
  }

  function downloadFallback() {
    const blob = new Blob([editor.value], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportFile() {
    // 1) Save directly to the open file
    if (fileHandle) {
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(editor.value);
        await writable.close();
        flashExport('Saved: ' + fileName);
        return;
      } catch (e) { /* permission lost - fallback below */ }
    }
    // 2) Save dialog, remember handle for later direct saves
    if (window.showSaveFilePicker) {
      try {
        fileHandle = await window.showSaveFilePicker({ suggestedName: fileName, types: MD_TYPES });
        fileName = fileHandle.name;
        const writable = await fileHandle.createWritable();
        await writable.write(editor.value);
        await writable.close();
        flashExport('Saved: ' + fileName);
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // cancelled - do nothing
      }
    }
    // 3) Fallback: Download
    downloadFallback();
  }

  async function importFile() {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({ types: MD_TYPES });
        const file = await handle.getFile();
        pushUndo();
        editor.value = await file.text();
        fileHandle = handle;
        fileName = handle.name;
        render(); scheduleSave();
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    fileInput.click(); // Fallback: classic file picker
  }

  document.getElementById('btn-export').addEventListener('click', exportFile);
  document.getElementById('btn-import').addEventListener('click', importFile);
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pushUndo();
      editor.value = String(reader.result);
      fileName = file.name; // direct save not possible without handle
      render(); scheduleSave();
    };
    reader.onerror = () => alert('Could not read file: ' + file.name);
    reader.readAsText(file);
    fileInput.value = '';
  });

  // ---------- A4 page view (toggle) ----------
  const btnA4 = document.getElementById('btn-a4');
  btnA4.addEventListener('click', () => {
    a4On = !a4On;
    preview.classList.toggle('a4-page', a4On);
    btnA4.classList.toggle('active', a4On);
    render();
  });

  // ---------- Print: automatically print-optimized preview ----------
  // When printing (Ctrl+P), A4 pagination is enabled and the preview view is
  // shown on mobile; after printing the state is restored.
  let printState = null;
  window.addEventListener('beforeprint', () => {
    printState = { a4: a4On, view: document.body.dataset.view };
    if (!a4On) {
      a4On = true;
      preview.classList.add('a4-page');
      btnA4.classList.add('active');
    }
    if (mobileQuery.matches) document.body.dataset.view = 'preview';
    render();
  });
  window.addEventListener('afterprint', () => {
    if (!printState) return;
    const st = printState; printState = null;
    a4On = st.a4;
    preview.classList.toggle('a4-page', a4On);
    btnA4.classList.toggle('active', a4On);
    if (mobileQuery.matches) document.body.dataset.view = st.view;
    render();
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

  // ---------- Mobile view toggle (labels + swipe gesture) ----------
  const mobileQuery = window.matchMedia('(max-width: 768px)');
  function setView(next) {
    document.body.dataset.view = next;
    if (next === 'preview') render();
  }
  if (mobileQuery.matches) {
    document.body.dataset.view = 'editor';
    document.querySelectorAll('.pane-label').forEach((el) => {
      el.addEventListener('click', () => {
        setView(el.dataset.label === 'editor' ? 'preview' : 'editor');
      });
    });
    // Swipe horizontally (> 60 px, clearly more horizontal than vertical) = switch view.
    const panesEl = document.querySelector('.panes');
    let swipeX = null, swipeY = null;
    panesEl.addEventListener('pointerdown', (e) => {
      if (!mobileQuery.matches || e.pointerType === 'mouse') return;
      swipeX = e.clientX; swipeY = e.clientY;
    });
    panesEl.addEventListener('pointerup', (e) => {
      if (swipeX === null) return;
      const dx = e.clientX - swipeX, dy = e.clientY - swipeY;
      swipeX = swipeY = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        setView(document.body.dataset.view === 'preview' ? 'editor' : 'preview');
      }
    });
  }

  // ---------- Init ----------
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) editor.value = saved;
  } catch (e) { /* storage unavailable – start empty */ }
  render();
})();
