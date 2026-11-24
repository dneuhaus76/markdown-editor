// Markdown-Editor – GPL-3.0 (see LICENSE)
// Editor I/O: import/export (File System Access API), drag&drop, paste, image embed.
(function () {
  'use strict';

  function init(ctx) {
    const { editor, fileInput } = ctx;

    // ---------- Image embedding (Drag&Drop + Paste → base64 Data-URI) ----------
    function insertImageFile(file) {
      if (!file || !file.type.startsWith('image/')) return;
      if (!file.size || file.size > MDConfig.MAX_IMAGE_BYTES) {
        alert('Bild zu gross (> ' + (MDConfig.MAX_IMAGE_BYTES / 1024 / 1024) + ' MB): ' + file.name);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = String(reader.result);
        const alt = (file.name || 'image').replace(/\.[^.]+$/, '');
        ctx.pushUndo();
        ctx.insertBlock('![' + alt + '](' + dataUri + ')');
      };
      reader.onerror = () => alert('Bild konnte nicht gelesen werden: ' + file.name);
      reader.readAsDataURL(file);
    }

    editor.addEventListener('dragover', (e) => { e.preventDefault(); });
    editor.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      const mdFile = Array.from(files).find(f => /\.(md|markdown)$/i.test(f.name) ||
        f.type === 'text/markdown' || f.type === 'text/plain');
      if (mdFile) {
        if (!confirm('Dokument ersetzen?')) return;
        ctx.pushUndo();
        mdFile.text().then(text => {
          editor.value = text;
          ctx.setFileName(mdFile.name);
          ctx.render(); ctx.scheduleSave(); ctx.updateCount();
        });
        return;
      }
      for (const f of files) insertImageFile(f);
    });

    editor.addEventListener('paste', (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          insertImageFile(item.getAsFile());
          break;
        }
      }
    });

    // ---------- Import / Export ----------
    let fileHandle = null;
    let fileName = 'document.md';
    const MD_TYPES = [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }];

    function setFileName(name) { fileName = name; }

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
      if (fileHandle) {
        try {
          const writable = await fileHandle.createWritable();
          await writable.write(editor.value);
          await writable.close();
          flashExport('Saved: ' + fileName);
          return;
        } catch (e) { /* permission lost – fallback below */ }
      }
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
          if (e.name === 'AbortError') return;
        }
      }
      downloadFallback();
    }

    async function importFile() {
      if (window.showOpenFilePicker) {
        try {
          const [handle] = await window.showOpenFilePicker({ types: MD_TYPES });
          const file = await handle.getFile();
          ctx.pushUndo();
          editor.value = await file.text();
          fileHandle = handle;
          fileName = handle.name;
          ctx.render(); ctx.scheduleSave(); ctx.updateCount();
          return;
        } catch (e) {
          if (e.name === 'AbortError') return;
        }
      }
      fileInput.click();
    }

    document.getElementById('btn-export').addEventListener('click', exportFile);
    document.getElementById('btn-import').addEventListener('click', importFile);
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        ctx.pushUndo();
        editor.value = String(reader.result);
        fileName = file.name;
        ctx.render(); ctx.scheduleSave(); ctx.updateCount();
      };
      reader.onerror = () => alert('Could not read file: ' + file.name);
      reader.readAsText(file);
      fileInput.value = '';
    });

    // Expose setFileName to ctx (used by drag&drop above).
    ctx.setFileName = setFileName;
  }

  window.EditorIO = { init };
})();
