# PLAN.md – Markdown-Editor (konsolidiert)

Zusammenfassung von `plan.md` (v1.0) und `plan_1.1.md` (v1.1 + v1.2-Nachträge),
inkl. integrierter `ToDo.md` (nun umgesetzt als v1.3). Ursprungsdokumente bleiben als Historie erhalten.

## 1. Auftrag & Architektur
- Kleine, funktionelle SPA: Markdown editieren + Live-Vorschau, optionale Toolbar.
- **Vanilla JS, keine Build-Tools, keine Dependencies** – läuft identisch auf
  Linux / Windows (PWA oder Tauri) / Mobile (PWA, Touch-Targets ≥ 40 px).
- Parser: **Mini-Parser `js/markdown.js` + Inline-HTML-Whitelist** (Entscheid v1.1).
  - Migrations-Auslöser für `markdown-it` (~14 kB, `parse()`-API bleibt gleich):
    mehr Inline-HTML/Attribute, Fussnoten, Mathematik, CommonMark-Edge-Cases, Plugins.
  - `DOMPurify` erst nötig bei beliebigem HTML.

## 2. Dateistruktur
```
index.html       Layout + Toolbar
css/style.css    Styles, responsive, Dark Mode
js/markdown.js   Mini Markdown-Parser (testbar via node)
js/app.js        State, Toolbar, Autosave, Import/Export
tests/           Parser-Unit-Tests (node --test)
```

## 3. Implementierter Stand (v1.0 + v1.1 + v1.2, alle Meilensteine erledigt)
| Bereich | Inhalt |
|---|---|
| Layout | Split-View Editor/Vorschau, Mobile: Umschalt-Labels, responsive ab 768 px |
| Toolbar | Fett, Kursiv, Durchgestrichen, Inline-Code, Codeblock, H1–H3, Liste, Tabelle, Link, Bild, Unterline `<u>`, `br`, Trennlinie `---`, Zitat `>`, Ein-/Ausrücken |
| Toggle-Logik | Inline-Wrap und Zeilenpräfixe: 2. Klick entfernt Formatierung; Codeblock/Tabelle bleiben Insertion |
| Parser | Überschriften, Inline-Formatierungen, Code, Listen (verschachtelt via Einrückung, Stack-basiert), Tabellen, Zitate, `---`, Inline-HTML-Whitelist (`<u>`, `<br>`), unbekannte Tags escaped |
| Sync-Scrolling | Bidirektional, proportional, Echo-Erkennung statt Flag, rAF-gedämpft |
| Splitter | Drag (Pointer Events, auch Touch), Clamp 20–80 %, Doppelklick = 50/50, Position in localStorage, feine dezente Trennlinie |
| Editor-Scrollbar | Ausgeblendet (Firefox + WebKit), Scrollen bleibt voll funktionsfähig |
| Persistenz | Auto-Save (localStorage) + Datei-Import/-Export (.md) |
| Help | `?`-Modal: About (v1.2, Local-First), Shortcuts, Syntax-Hilfe; Esc/Klick schliesst |
| Shortcuts | Strg/Cmd+B Fett, Strg/Cmd+I Kursiv, Strg/Cmd+K Link (Fix v1.2) |
| Tests | 22/22 grün (`node --test`) |

## 4. Offene Punkte (bewusste Annahmen)
- Kein Login/Multi-User/WYSIWYG; nur Split-View.
- `<u>` ist HTML, kein Markdown-Standard – bewusst als Kompromiss.
- Sync-Scrolling proportional, nicht zeilenexakt.
- Splitter-Position pro Browser/Host (localStorage), nicht pro Dokument.

## 5. v0.1.3 – umgesetzt (aus ToDo.md)

> Versionsnamensgebung: `0.x` = noch nicht produktionsreif (umbenannt von v1.3).
1. [x] **Speichern statt Download**: Export speichert direkt in die geöffnete Datei
   (File System Access API: `showOpenFilePicker` beim Laden, Handle in Session
   gehalten; `showSaveFilePicker` als Zwischenschritt; Fallback = Download).
2. [x] **`?`-Knopf** oben rechts ganz aussen (nach Import/Export).
3. [x] **Mobile: Wisch-Geste** – horizontal wischen (> 60 px) schaltet zwischen
   EDITOR und VORSCHAU um (ergänzt die Umschalt-Labels).
4. [x] **A4-Seitenansicht**: Toolbar-Knopf `A4` zeigt die Vorschau als A4-Blatt
   (210 × 297 mm, Seitenende sichtbar, Papier-Look).

## 6. v0.1.4 – umgesetzt (aus ToDo.md)
1. [x] **Bug Code-Button**: markierter Text wurde ersetzt – Button klaut den Fokus
   (v.a. mobil), Auswahl ging verloren. Fix: `mousedown`-preventDefault an der
   Toolbar; nach dem Wrap ist nur noch der Inhalt (ohne Marker) markiert.
2. [x] **Bug A4**: zeigt jetzt echte Seitenbrüche – JS-Paginierung misst die
   Blöcke und verteilt sie auf 297-mm-Blätter; dazu Print-Stylesheet
   (`@page size: A4`), damit Drucken/PDF-Export mit der Vorschau übereinstimmt.
3. [x] **Task-Liste**: `- [ ] Aufgabe` / `- [x] fertig`; Checkbox in der Vorschau
   ist klickbar und toggelt die Quelle; Toolbar-Button ☑ (Toggle).
4. [x] **Heading-ID**: `### Titel {#custom-id}` → `<h3 id="custom-id">`.
5. [x] **Highlight**: `==text==` → `<mark>`.
6. [x] **Subskript/Superskript**: `H~2~O` → `<sub>`, `X^2^` → `<sup>`
   (Toolbar-Buttons X₂ / X², HL).

## 7. Weiterer Backlog
- (leer – offen bleiben: IndexedDB-Persistenz der Datei-Handle über Reloads,
  zeilenexaktes Sync-Scrolling)
