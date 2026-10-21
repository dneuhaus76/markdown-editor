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

## Features (Version 0.1.4, 0.x = noch nicht produktionsreif)
- Split-View: Editor links, Live-Vorschau rechts (Mobile: Umschalt-Labels)
- Toolbar: Fett, Kursiv, Unterline, Durchgestrichen, Inline-Code, Codeblock,
  Highlight (==), Sub-/Superskript, H1–H3, Liste, Task-Liste, Tabelle, Zitat,
  Trennlinie, Link, Bild
- Shortcuts: Strg/Cmd+B (Fett), Strg/Cmd+I (Kursiv), Strg/Cmd+K (Link)
- Auto-Save in localStorage, Datei-Import/-Export (.md);
  mit File System Access API (Chromium) speichert Export direkt in die geöffnete Datei
- A4-Seitenansicht (Knopf `A4`) mit echten Seitenbrüchen + Print-Stylesheet
  für PDF-Export, Mobile: Wisch-Geste Editor/Vorschau
- Task-Liste (`- [ ]` / `- [x]`, Checkbox in der Vorschau klickbar),
  Heading-IDs (`### Titel {#id}`), Highlight, Sub-/Superskript
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
