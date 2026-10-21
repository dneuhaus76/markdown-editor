# Markdown-Editor

Sehr kleiner, funktionaler Markdown-Editor mit Live-Vorschau und Toolbar.
Kein Framework, keine Build-Tools, keine Dependencies (Vanilla JS + CSS).

## Start (Linux)
```bash
cd markdown-editor
python3 -m http.server 8080
# Browser: http://localhost:8080
```
Alternativ: `index.html` direkt im Browser öffnen.

## Features
- Split-View: Editor links, Live-Vorschau rechts (Mobile: Umschalt-Labels)
- Toolbar: Fett, Kursiv, Durchgestrichen, Inline-Code, Codeblock, H1–H3,
  Liste, Tabelle, Link, Bild
- Shortcuts: Strg/Cmd+B (Fett), Strg/Cmd+K (Kursiv)
- Auto-Save in localStorage, Datei-Import/-Export (.md)
- Dark Mode via `prefers-color-scheme`

## Tests
```bash
node --test
```

## Plattform-Strategie
- **Linux**: Browser (heute)
- **Windows**: PWA oder Tauri-Wrapper um dieselbe Basis
- **Mobile**: PWA (responsive, Touch-Targets ≥ 40 px)

## Struktur
```
index.html       Layout + Toolbar
css/style.css    Styles, responsive, Dark Mode
js/markdown.js   Mini Markdown-Parser (testbar via node)
js/app.js        State, Toolbar, Autosave, Import/Export
tests/           Parser-Unit-Tests (node --test)
```
