// Markdown-Editor – GPL-3.0 (see LICENSE)
// Thin orchestrator: shared context, undo, autosave, module init.
// Modules: preview.js, editor-io.js, search.js, ui.js
(function () {
  'use strict';

  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const fileInput = document.getElementById('file-input');

  // Shared context passed to all modules. Functions are resolved at call time
  // so init order only matters for the first render, not for event handlers.
  const ctx = { editor, preview, fileInput };

  // ---------- Undo ----------
  // Snapshot stack: setRangeText (toolbar actions) does not reach the native
  // browser undo history, so it is managed separately here.
  const undoStack = [];
  ctx.undoStack = undoStack;
  function pushUndo() {
    undoStack.push({ value: editor.value, start: editor.selectionStart, end: editor.selectionEnd });
    if (undoStack.length > MDConfig.UNDO_LIMIT) undoStack.shift();
  }
  function undo() {
    const s = undoStack.pop();
    if (!s) return;
    editor.value = s.value;
    editor.setSelectionRange(s.start, s.end);
    dirty();
  }
  ctx.pushUndo = pushUndo;
  ctx.undo = undo;

  // ---------- Insert block (toolbar + image embed) ----------
  function insertBlock(text) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    pushUndo();
    editor.setRangeText(text, start, end, 'end');
    editor.focus();
    dirty();
  }
  ctx.insertBlock = insertBlock;

  // ---------- Autosave (debounced) ----------
  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(MDConfig.STORAGE_KEY, editor.value); }
      catch (e) { /* storage full or private mode – non-fatal */ }
    }, MDConfig.SAVE_DEBOUNCE_MS);
  }
  ctx.scheduleSave = scheduleSave;

  // ---------- Dirty: content changed → refresh preview, persist, counter ----------
  function dirty() {
    ctx.scheduleRender();
    scheduleSave();
    ctx.updateCount();
  }
  ctx.dirty = dirty;

  editor.addEventListener('beforeinput', pushUndo);
  editor.addEventListener('input', () => {
    ctx.scheduleRender();
    scheduleSave();
    ctx.updateCount();
  });

  // ---------- Init modules (order: Preview sets render, UI sets updateCount) ----------
  PreviewModule.init(ctx);
  EditorIO.init(ctx);
  SearchModule.init(ctx);
  UIModule.init(ctx);

  // ---------- Restore + initial render ----------
  try {
    const saved = localStorage.getItem(MDConfig.STORAGE_KEY);
    if (saved !== null) editor.value = saved;
  } catch (e) { /* storage unavailable – start empty */ }
  ctx.render();
  ctx.updateCount();

})();
