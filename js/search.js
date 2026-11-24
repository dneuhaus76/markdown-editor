// Markdown-Editor – GPL-3.0 (see LICENSE)
// Find & Replace bar.
(function () {
  'use strict';

  function init(ctx) {
    const { editor } = ctx;
    let searchBar = null;
    let searchMatches = [];
    let currentMatchIdx = -1;

    function createSearchBar() {
      if (searchBar) return searchBar;
      searchBar = document.createElement('div');
      searchBar.className = 'search-bar';
      searchBar.innerHTML = `
        <div class="search-row">
          <input type="text" class="search-input" placeholder="Suchen..." />
          <span class="search-count">0/0</span>
          <button class="search-btn" title="Vorheriger (Shift+Enter)" data-action="prev">\u2191</button>
          <button class="search-btn" title="Nächster (Enter)" data-action="next">\u2193</button>
          <button class="search-btn close-btn" title="Schliessen (Esc)" data-action="close">\u00d7</button>
        </div>
        <div class="replace-row" style="display: none;">
          <input type="text" class="replace-input" placeholder="Ersetzen durch..." />
          <button class="search-btn" title="Ersetzen" data-action="replace">Ersetzen</button>
          <button class="search-btn" title="Alle ersetzen" data-action="replaceAll">Alle</button>
        </div>
      `;
      document.body.appendChild(searchBar);

      const sInput = searchBar.querySelector('.search-input');
      const rInput = searchBar.querySelector('.replace-input');
      const countEl = searchBar.querySelector('.search-count');
      const replaceRow = searchBar.querySelector('.replace-row');

      function updateMatches() {
        const q = sInput.value;
        searchMatches = [];
        currentMatchIdx = -1;
        if (!q) { countEl.textContent = '0/0'; return; }
        const val = editor.value;
        const lval = val.toLowerCase();
        const lq = q.toLowerCase();
        let pos = 0;
        while ((pos = lval.indexOf(lq, pos)) !== -1) {
          searchMatches.push({ start: pos, end: pos + q.length });
          pos += q.length;
        }
        if (searchMatches.length === 0) { countEl.textContent = '0/0'; return; }
        const curPos = editor.selectionStart;
        const idx = searchMatches.findIndex(m => m.start >= curPos);
        currentMatchIdx = idx !== -1 ? idx : 0;
        jumpToMatch(currentMatchIdx);
      }

      function jumpToMatch(idx) {
        if (searchMatches.length === 0) { countEl.textContent = '0/0'; return; }
        if (idx < 0) idx = searchMatches.length - 1;
        if (idx >= searchMatches.length) idx = 0;
        currentMatchIdx = idx;
        const m = searchMatches[currentMatchIdx];
        editor.setSelectionRange(m.start, m.end);
        editor.focus();
        countEl.textContent = (currentMatchIdx + 1) + '/' + searchMatches.length;
      }

      sInput.addEventListener('input', () => updateMatches());
      sInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          jumpToMatch(e.shiftKey ? currentMatchIdx - 1 : currentMatchIdx + 1);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeSearch();
        }
      });

      rInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); replaceOne(); }
        else if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
      });

      searchBar.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const act = btn.dataset.action;
        if (act === 'next') jumpToMatch(currentMatchIdx + 1);
        if (act === 'prev') jumpToMatch(currentMatchIdx - 1);
        if (act === 'close') closeSearch();
        if (act === 'replace') replaceOne();
        if (act === 'replaceAll') replaceAll();
      });

      return searchBar;
    }

    function openSearch(showReplace) {
      const bar = createSearchBar();
      const replaceRow = bar.querySelector('.replace-row');
      replaceRow.style.display = showReplace ? 'flex' : 'none';
      bar.style.display = 'block';
      const sInput = bar.querySelector('.search-input');
      const sel = editor.value.slice(editor.selectionStart, editor.selectionEnd);
      if (sel && !sel.includes('\n')) sInput.value = sel;
      sInput.focus();
      sInput.select();
      sInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function closeSearch() {
      if (searchBar) searchBar.style.display = 'none';
      editor.focus();
    }

    function replaceOne() {
      if (currentMatchIdx < 0 || currentMatchIdx >= searchMatches.length) return;
      const m = searchMatches[currentMatchIdx];
      const rInput = searchBar.querySelector('.replace-input');
      ctx.pushUndo();
      editor.setRangeText(rInput.value, m.start, m.end, 'select');
      ctx.scheduleRender(); ctx.scheduleSave(); ctx.updateCount();
      searchBar.querySelector('.search-input').dispatchEvent(new Event('input', { bubbles: true }));
    }

    function replaceAll() {
      const sInput = searchBar.querySelector('.search-input');
      const rInput = searchBar.querySelector('.replace-input');
      const q = sInput.value;
      if (!q) return;
      const val = editor.value;
      ctx.pushUndo();
      const lval = val.toLowerCase();
      const lq = q.toLowerCase();
      let newVal = '', lastIdx = 0, pos = 0, count = 0;
      while ((pos = lval.indexOf(lq, lastIdx)) !== -1) {
        newVal += val.slice(lastIdx, pos) + rInput.value;
        lastIdx = pos + q.length;
        count++;
      }
      newVal += val.slice(lastIdx);
      if (count > 0) {
        editor.value = newVal;
        ctx.scheduleRender(); ctx.scheduleSave(); ctx.updateCount();
        searchMatches = [];
        currentMatchIdx = -1;
        searchBar.querySelector('.search-count').textContent = '0/0';
      }
    }

    // Expose to ctx.
    ctx.openSearch = openSearch;
    ctx.closeSearch = closeSearch;
  }

  window.SearchModule = { init };
})();
