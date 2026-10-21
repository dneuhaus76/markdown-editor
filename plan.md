# Plan: Markdown-Editor (minimal, funktional)

## Auftrag
Sehr kleine, funktionelle App: Markdown editieren + Live-Vorschau.
Optionale Toolbar oben für gängige Formatierungen (Fett, Kursiv, Tabelle, Link, Bild usw.).
Heute nur Linux entwickeln – aber so aufgebaut, dass Mobile und Windows gleichwertig daraus entstehen können.

## Architektur-Entscheid
**Web-basiert (Single-Page-App, Vanilla JS, keine Build-Tools)**
- Läuft in jedem Browser (Linux/Windows/Mobile identisch).
- Kein Framework, keine Dependencies -> minimale Abhängigkeiten.
- Später: Windows via PWA / Tauri, Mobile via PWA (Add to Home Screen).
- Markdown-Rendering: eigenes Mini-Parser (Standard-Lib-Prinzip) oder 1 kleine Library (marked.js) – Entscheidung bei Umsetzung, Default: `marked.js` via CDN-freiem Local-Bundle.

## Dateistruktur
```
markdown-editor/
├── plan.md          # dieses Dokument
├── index.html       # Layout: Toolbar, Editor, Vorschau
├── css/style.css    # Styles, responsive (Mobile-tauglich von Anfang an)
├── js/app.js        # State, Toolbar-Actions, Event-Handling
├── js/markdown.js   # Mini Markdown-Parser (oder Adapter zu marked.js)
└── README.md        # Start: `python3 -m http.server` oder einfach index.html öffnen
```

## Features (MVP)
1. **Zweispaltige Ansicht**: links Editor (textarea), rechts Live-Vorschau.
   - Mobile: Toggle-Button «Editor / Vorschau» (nur eine Ansicht sichtbar).
2. **Toolbar** (klickbar, wählt Text aus und wickelt es ein):
   - Fett `**`
   - Kursiv `*`
   - Durchgestrichen `~~`
   - Inline-Code `` ` ``
   - Link `[text](url)`
   - Bild `![alt](url)`
   - Liste `- `
   - Tabelle (Template einfügen)
   - Überschrift (H1–H3)
   - Codeblock ` ``` `
3. **Live-Vorschau**: bei Tastendruck (debounced ~150 ms) neu rendern.
4. **Speichern**: localStorage (Auto-Save) + optional Datei-Export/Import (.md via File-API).

## Markdown-Parser – Scope (bewusst klein)
Unterstützt: Überschriften, Fett/Kursiv/Durchgestrichen, Inline-Code, Codeblocks,
Links, Bilder, Ungeordnete/Geordnete Listen, Tabellen, Zitate, Trennlinie, Absätze.
Nicht (vorerst): Fussnoten, Mathematik, verschachtelte Aufgabenlisten.

## Plattform-Strategie (gleiche Basis)
| Ziel     | Ansatz                                                        |
|----------|---------------------------------------------------------------|
| Linux    | Direkt im Browser / `python3 -m http.server` (heute)          |
| Windows  | PWA oder Tauri-Wrapper um dieselbe HTML/JS-Basis             |
| Mobile   | PWA (responsive CSS bereits eingebaut), Add to Home Screen    |

Dafuer: keine Desktop-spezifische API, Touch-freundliche Toolbar (min. 40 px Targets),
responsive Breakpoints ab 768 px.

## Tests (minimal)
- `js/tests.js` (oder `tests/test.sh`): Parser-Unit-Tests mit `node --test` gegen `markdown.js`
  (Fett, Link, Tabelle, Codeblock, Edge-Cases: leere Eingabe, ungeschlossene Tags).
- Manuell: Browser auf Linux, Mobile-Emulation (DevTools) pruefen.

## Meilensteine
1. [x] Grundgerüst: index.html + CSS (Zweispaltig, responsive)
2. [x] Mini-Parser `markdown.js` + Unit-Tests (13/13 grün)
3. [x] Live-Vorschau mit Debounce
4. [x] Toolbar-Actions (Wrap-Logik + Tabelle/Codeblock-Templates)
5. [x] Auto-Save (localStorage) + Datei-Import/Export
6. [x] README + kurzer Linux-Starttest (HTTP 200 auf alle Assets)

## Offene Punkte / Annahmen
- Kein Login, kein Multi-User, kein WYSIWYG – nur Split-View.
- Dark Mode: optional (Media-Query `prefers-color-scheme`), nicht Pflicht.
- Sprache der UI: Deutsch (de_CH).
