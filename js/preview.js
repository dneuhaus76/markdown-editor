// Markdown-Editor – GPL-3.0 (see LICENSE)
// Preview: render, A4 pagination, Mermaid, scroll-sync, print handlers.
(function () {
  'use strict';

  function init(ctx) {
    const { editor, preview } = ctx;
    let a4On = false;

    // ---------- Mermaid (lazy) ----------
    function initMermaid() {
      if (window.mermaid) {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
      }
    }
    async function runMermaid() {
      if (!window.mermaid) return;
      try { await mermaid.run({ nodes: preview.querySelectorAll('.mermaid') }); }
      catch (e) { /* invalid diagram – show raw text */ }
    }

    // ---------- A4 pagination ----------
    function paginateA4(html) {
      const sheet = document.createElement('div');
      sheet.className = 'a4-sheet a4-measure';
      sheet.innerHTML = html;
      preview.appendChild(sheet);
      const cs = getComputedStyle(sheet);
      const budget = MDConfig.A4_HEIGHT_MM * MDConfig.PX_PER_MM - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const pages = [];
      let cur = [], used = 0;
      for (const el of sheet.children) {
        if (el.classList.contains('page-break')) {
          if (cur.length) { pages.push(cur); cur = []; used = 0; }
          continue;
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

    // ---------- Render ----------
    function render() {
      const html = Markdown.parse(editor.value);
      preview.innerHTML = a4On ? paginateA4(html) : html;
      runMermaid();
    }
    let renderTimer = null;
    function scheduleRender() {
      clearTimeout(renderTimer);
      renderTimer = setTimeout(render, MDConfig.RENDER_DEBOUNCE_MS);
    }

    // ---------- A4 toggle button ----------
    const btnA4 = document.getElementById('btn-a4');
    btnA4.addEventListener('click', () => {
      a4On = !a4On;
      preview.classList.toggle('a4-page', a4On);
      btnA4.classList.toggle('active', a4On);
      render();
    });

    // ---------- Print: auto A4 + mobile preview ----------
    const mobileQuery = window.matchMedia('(max-width: 768px)');
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

    // ---------- Scroll-sync (proportional) ----------
    function syncScroll(src, dst) {
      const max = src.scrollHeight - src.clientHeight;
      if (max <= 0) return;
      const ratio = src.scrollTop / max;
      const target = Math.round(ratio * (dst.scrollHeight - dst.clientHeight));
      if (Math.abs(dst.scrollTop - target) <= 1) return;
      dst.scrollTop = target;
    }
    editor.addEventListener('scroll', () => syncScroll(editor, preview));
    preview.addEventListener('scroll', () => syncScroll(preview, editor));

    // Expose to other modules via ctx.
    ctx.render = render;
    ctx.scheduleRender = scheduleRender;
    initMermaid();
  }

  window.PreviewModule = { init };
})();
