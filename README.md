# Markdown-Editor

Very small, functional Markdown editor with live preview and toolbar.
No framework, no build tools, no dependencies (Vanilla JS + CSS).

## Start (Linux)
```bash
cd markdown-editor
python3 -m http.server 8080
# Browser: http://localhost:8080
```
Alternatively: open `index.html` directly in the browser.

## Features (Version 0.1.6, 0.x = not yet production-ready)
- Split view: editor on the left, live preview on the right (mobile: toggle labels)
- Toolbar: bold, italic, underline, strikethrough, inline code, code block,
  highlight (==), sub/superscript, H1–H3, list, task list, table, quote,
  horizontal rule, link, image, clear document, page break
- Shortcuts: Ctrl/Cmd+B (bold), Ctrl/Cmd+I (italic), Ctrl/Cmd+K (link),
  Ctrl/Cmd+Z (undo), Ctrl/Cmd+P (print with A4 preview)
- Autosave to localStorage, file import/export (.md);
  with the File System Access API (Chromium) export saves directly to the open file
- A4 page view (button `A4`) with real page breaks + print stylesheet
  for PDF export; mobile: swipe gesture editor/preview
- Task list (`- [ ]` / `- [x]`, checkbox clickable in the preview),
  heading IDs (`### Title {#id}`), highlight, sub/superscript
- Dark mode via `prefers-color-scheme`

## Tests
```bash
node --test
```

## Platform strategy
- **Linux**: browser (today)
- **Windows**: PWA or Tauri wrapper around the same base
- **Mobile**: PWA (responsive, touch targets >= 40 px)

## Structure
```
index.html       Layout + toolbar
css/style.css    Styles, responsive, dark mode
js/markdown.js   Mini Markdown parser (testable via node)
js/app.js        State, toolbar, autosave, import/export
tests/           Parser unit tests (node --test)
```
