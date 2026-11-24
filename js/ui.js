// Markdown-Editor – GPL-3.0 (see LICENSE)
// UI: toolbar actions + burger panel, splitter, help modal, mobile view, status bar.
(function () {
  'use strict';

  function init(ctx) {
    const { editor } = ctx;

    // ---------- Toolbar helpers ----------
    function applyTransform(result) {
      ctx.pushUndo();
      editor.value = result.value;
      editor.setSelectionRange(result.selStart, result.selEnd);
      editor.focus();
      ctx.dirty();
    }

    function wrapSelection(before, after, placeholder, conflict) {
      applyTransform(Transform.wrapSelection(editor.value, editor.selectionStart, editor.selectionEnd, before, after, placeholder, conflict));
    }
    function prefixLines(prefix) {
      applyTransform(Transform.prefixLines(editor.value, editor.selectionStart, editor.selectionEnd, prefix));
    }
    function indentLines(dir) {
      applyTransform(Transform.indentLines(editor.value, editor.selectionStart, editor.selectionEnd, dir));
    }
    function codeblockAction() {
      const r = Transform.codeblockTransform(editor.value, editor.selectionStart, editor.selectionEnd);
      if (r) { applyTransform(r); return; }
      ctx.insertBlock('```\n' + (editor.value.slice(editor.selectionStart, editor.selectionEnd) || 'code') + '\n```\n');
    }
    function toggleTaskLines() {
      applyTransform(Transform.toggleTaskLines(editor.value, editor.selectionStart, editor.selectionEnd));
    }

    const TABLE_TEMPLATE =
      '| Column 1 | Column 2 | Column 3 |\n' +
      '|----------|----------|----------|\n' +
      '| Text     | Text     | Text     |\n';
    const MERMAID_TEMPLATE =
      '```mermaid\n' +
      'graph TD\n' +
      '  A[Start] --> B{Entscheidung}\n' +
      '  B -->|Ja| C[Ende]\n' +
      '  B -->|Nein| A\n' +
      '```\n';

    const actions = {
      clear:     () => {
        if (!editor.value) return;
        if (!confirm('Clear document? (Ctrl+Z = Undo)')) return;
        ctx.pushUndo();
        editor.value = '';
        editor.focus();
        ctx.dirty();
      },
      bold:      () => wrapSelection('**', '**', 'bold'),
      italic:    () => wrapSelection('_', '_', 'italic'),
      strike:    () => wrapSelection('~~', '~~', 'strikethrough'),
      underline: () => wrapSelection('<u>', '</u>', 'underlined'),
      br:        () => ctx.insertBlock('<br>'),
      code:      () => wrapSelection('`', '`', 'code'),
      codeblock: codeblockAction,
      pagebreak: () => ctx.insertBlock('\n<div class="page-break"></div>\n'),
      highlight: () => wrapSelection('==', '==', 'highlight'),
      sub:       () => wrapSelection('~', '~', 'sub', { before: '^', after: '^' }),
      sup:       () => wrapSelection('^', '^', 'sup', { before: '~', after: '~' }),
      task:      () => toggleTaskLines(),
      hr:        () => ctx.insertBlock('\n---\n'),
      h1:        () => prefixLines('# '),
      h2:        () => prefixLines('## '),
      h3:        () => prefixLines('### '),
      ul:        () => prefixLines('- '),
      indent:    () => indentLines(1),
      outdent:   () => indentLines(-1),
      quote:     () => prefixLines('> '),
      table:     () => ctx.insertBlock(TABLE_TEMPLATE),
      mermaid:   () => ctx.insertBlock(MERMAID_TEMPLATE),
      link:      () => wrapSelection('[', '](https://)', 'Linktext'),
      image:     () => wrapSelection('![', '](https://)', 'Alttext'),
    };

    // ---------- Burger panel ----------
    const btnBurger = document.getElementById('btn-burger');
    const toolbarPanel = document.getElementById('toolbar-panel');
    function closePanel() {
      if (toolbarPanel.hidden) return;
      toolbarPanel.hidden = true;
      btnBurger.setAttribute('aria-expanded', 'false');
      btnBurger.classList.remove('active');
    }

    // mousedown preventDefault keeps editor focus so the selection survives.
    // On mobile, touchstart saves the selection (preventDefault would kill click).
    const toolbarEl = document.querySelector('.toolbar');
    let savedSel = null;
    toolbarEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) e.preventDefault();
    });
    toolbarEl.addEventListener('touchstart', (e) => {
      if (e.target.closest('button')) {
        savedSel = { start: editor.selectionStart, end: editor.selectionEnd };
      }
    }, { passive: true });
    toolbarEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      if (savedSel) {
        editor.focus();
        editor.setSelectionRange(savedSel.start, savedSel.end);
        savedSel = null;
      }
      const fn = actions[btn.dataset.action];
      if (fn) fn();
      closePanel();
    });

    btnBurger.addEventListener('click', () => {
      const open = toolbarPanel.hidden;
      toolbarPanel.hidden = !open;
      btnBurger.setAttribute('aria-expanded', String(open));
      btnBurger.classList.toggle('active', open);
    });
    document.addEventListener('mousedown', (e) => {
      if (!toolbarPanel.hidden && !toolbarPanel.contains(e.target) && e.target !== btnBurger) closePanel();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !toolbarPanel.hidden) closePanel();
    });

    // ---------- Task list: preview checkbox → editor ----------
    const preview = document.getElementById('preview');
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
          ctx.pushUndo();
          lines[i] = lines[i].replace(/\[[ xX]\]/, cb.checked ? '[x]' : '[ ]');
          editor.value = lines.join('\n');
          ctx.dirty();
          return;
        }
      }
    });

    // ---------- Keyboard shortcuts ----------
    editor.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey)) {
        if (e.key === 'Escape') ctx.closeSearch();
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); actions.bold(); }
      if (k === 'i') { e.preventDefault(); actions.italic(); }
      if (k === 'k') { e.preventDefault(); actions.link(); }
      if (k === 'z' && !e.shiftKey && ctx.undoStack.length) { e.preventDefault(); ctx.undo(); }
      if (k === 'f') { e.preventDefault(); ctx.openSearch(false); }
      if (k === 'h') { e.preventDefault(); ctx.openSearch(true); }
    });

    // ---------- Splitter ----------
    const panes = document.querySelector('.panes');
    const splitter = document.getElementById('splitter');
    function setSplit(pct) {
      pct = Math.min(80, Math.max(20, pct));
      panes.style.setProperty('--split', pct + '%');
      try { localStorage.setItem(MDConfig.SPLIT_KEY, String(pct)); } catch (e) { /* non-fatal */ }
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
      const savedSplit = parseFloat(localStorage.getItem(MDConfig.SPLIT_KEY));
      if (savedSplit) setSplit(savedSplit);
    } catch (e) { /* storage unavailable */ }

    // ---------- Help / About modal ----------
    const helpOverlay = document.getElementById('help-overlay');
    const helpCloseBtn = document.getElementById('help-close');
    let lastFocused = null;
    function openHelp() {
      lastFocused = document.activeElement;
      helpOverlay.hidden = false;
      helpCloseBtn.focus();
    }
    function closeHelp() {
      helpOverlay.hidden = true;
      if (lastFocused) lastFocused.focus();
    }
    document.getElementById('btn-help').addEventListener('click', openHelp);
    helpCloseBtn.addEventListener('click', closeHelp);
    helpOverlay.addEventListener('click', (e) => {
      if (e.target === helpOverlay) closeHelp();
    });
    // Focus trap: Tab cycles within the modal.
    helpOverlay.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        helpCloseBtn.focus();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !helpOverlay.hidden) closeHelp();
    });

    // ---------- Mobile view toggle ----------
    const mobileQuery = window.matchMedia('(max-width: 768px)');
    function setView(next) {
      if (next !== 'editor' && next !== 'preview') return;
      document.body.dataset.view = next;
      if (next === 'preview') ctx.render();
    }
    if (mobileQuery.matches) {
      document.body.dataset.view = 'editor';
      document.querySelectorAll('.pane-label').forEach((el) => {
        el.addEventListener('click', () => {
          setView(el.dataset.label === 'editor' ? 'preview' : 'editor');
        });
      });
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

    // ---------- Status bar (word/char counter) ----------
    const statusBar = document.createElement('div');
    statusBar.className = 'status-bar';
    document.body.appendChild(statusBar);
    function updateCount() {
      const text = editor.value;
      const t = text.trim();
      const words = t ? t.split(/\s+/).length : 0;
      statusBar.textContent = words + ' Wörter · ' + text.length + ' Zeichen';
    }

    // Expose to ctx.
    ctx.updateCount = updateCount;
  }

  window.UIModule = { init };
})();
