# PLAN.md – Markdown-Editor (konsolidiert)

Single Source of Truth für die Roadmap. Enthält Auftrag, aktuellen Stand, alle
Versions-Deltas und die Historie (v1.0–v1.2) in Abschnitt 10 – die früheren
Dokumente `plan.md` und `plan_1.1.md` sind damit integriert und gelöscht.

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

## 7. v0.1.5 – umgesetzt (aus ToDo.md)
1. [x] **Bug Toggle-Verdopplung**: nur der innere Text markiert (z.B. `fett`
   in `**fett**`) verdoppelte die Marker zu `****fett****`. Fix: `wrapSelection`
   prüft zusätzlich die direkt an der Auswahl liegenden Marker und toggelt dann
   ab (gilt für alle Inline-Formatierungen; Header waren bereits korrekt).
2. [x] **Strg/Cmd+Z Rückgängig**: eigener Snapshot-Stack (max. 100), da
   `setRangeText` die native Browser-Undo-Historie nicht erreicht; deckt
   Tippen, Einfügen, Löschen und alle Toolbar-Aktionen ab.
3. [x] **Print = print-optimierte Vorschau**: `beforeprint` aktiviert
   automatisch die A4-Paginierung (auf Mobile die Vorschau-Ansicht),
   `afterprint` stellt den vorherigen Zustand wieder her.
4. [x] Toolbar neu sortiert (Benutzeränderung: Tabelle vor Task/Liste).

## 8. v0.1.6 – umgesetzt (aus ToDo.md)
1. [x] **Bug Codeblock-Button**: markierter Text wurde durch das Template ersetzt.
   Fix: Auswahl wird in Fences eingepackt; bereits eingezäunte Auswahl
   (```…```) = Toggle off; ohne Auswahl = Template wie bisher.
2. [x] **Button „Dokument leeren“** (✕, rechts vor A4): leert den Editor mit
   Bestätigungsdialog; Strg+Z macht es rückgängig.
3. [x] **Button „Seitenumbruch“** (PB): setzt `<div class="page-break"></div>`
   (eigene Zeile, Parser-Whitelist wie `<u>`/`<br>`); CSS `page-break-after`
   für Print + A4-Paginierung bricht an dieser Stelle auf eine neue Seite.

## 9. Weiterer Backlog
- (leer – offen bleiben: IndexedDB-Persistenz der Datei-Handle über Reloads,
  zeilenexaktes Sync-Scrolling)

## 10. Historie (v1.0–v1.2, aus `plan.md` und `plan_1.1.md`)

### 10.1 v1.0 – Ursprung (plan.md)
- **Auftrag**: sehr kleine, funktionelle SPA: Markdown editieren + Live-Vorschau,
  optionale Toolbar; heute Linux, aber so aufgebaut, dass Mobile und Windows
  gleichwertig daraus entstehen können.
- **Architektur-Entscheid**: Web-basiert, Vanilla JS, keine Build-Tools/Frameworks;
  Windows später via PWA/Tauri, Mobile via PWA. Parser: Mini-Parser statt Library
  (Default war `marked.js`, beim Umsetzen auf Mini-Parser reduziert).
- **MVP-Scope**: Split-View (Mobile: Toggle), Toolbar (Fett, Kursiv, Durchgestrichen,
  Inline-Code, Link, Bild, Liste, Tabelle, H1–H3, Codeblock), Live-Vorschau
  (debounced ~150 ms), Auto-Save (localStorage) + Datei-Import/-Export.
- **Parser-Scope (bewusst klein)**: Überschriften, Fett/Kursiv/Durchgestrichen,
  Inline-Code, Codeblocks, Links, Bilder, Listen, Tabellen, Zitate, Trennlinie,
  Absätze. Nicht (vorerst): Fussnoten, Mathematik, verschachtelte Aufgabenlisten.
- **Plattform-Strategie**: keine Desktop-spezifische API, Touch-Targets ≥ 40 px,
  responsive Breakpoint 768 px. UI-Sprache Deutsch (de_CH).
- **Meilensteine (alle erledigt)**: Grundgerüst, Mini-Parser + Tests (13/13),
  Live-Vorschau, Toolbar-Actions, Auto-Save + Import/Export, README + Starttest.

### 10.2 v1.1 – Delta (plan_1.1.md)
- **Sync-Scrolling**: bidirektional, proportionales Mapping
  (`ratio = scrollTop / (scrollHeight - clientHeight)`), Echo-Erkennung statt Flag,
  rAF-gedämpft; auf Mobile inaktiv.
- **Toolbar-Toggle**: zweiter Klick entfernt dieselbe Formatierung
  (Inline-Wrap: Marker direkt an der Auswahl entfernen; Zeilenpräfixe: gleiches
  Präfix entfernen, anderes derselben Art ersetzen); Codeblock/Tabelle bleiben
  Insertion (Codeblock wurde in v0.1.6 um ein Wrap/Toggle ergänzt).
- **Neue Actions**: Unterline `<u>`, Zeilenumbruch `<br>`, Trennlinie `---`.
- **Parser**: Inline-HTML-Whitelist (`<u>`, `</u>`, `<br>`, `<br/>`), nach
  HTML-Escape wiederhergestellt; unbekannte Tags bleiben escaped.
- **Splitter**: `.splitter`-Div (Pointer Events, auch Touch), Breite via
  CSS-Variable `--split`, Clamp 20–80 %, Doppelklick = 50/50, Position in
  localStorage; feine dezente Trennlinie; Editor-Scrollbar ausgeblendet
  (Firefox + WebKit), Vorschau-Scrollbar bleibt sichtbar.
- **Tests**: 16/16 grün; Toolbar-Toggle manuell geprüft (kein DOM-Test-Framework).

### 10.3 v1.2 – Nachträge (plan_1.1.md, Abschnitt 9)
- **Zitat-Knopf `>`** (Toggle auf Präfix `> `).
- **Verschachtelte Listen**: Einrückungsstufen (2 Leerzeichen/Tab = 1 Stufe,
  beliebig tief), Stack-basiert; CSS `padding-left: 1.4em`; Ein-/Ausrücken-Knöpfe.
- **Help/About-Modal** (`?`-Knopf): Version, Local-First-Hinweis, Shortcuts,
  Syntax-Tabelle; Esc/Klick draussen schliesst.
- **Shortcut-Fix**: Strg+I = Kursiv, Strg+K = Link (vorher vertauscht/inaktiv).
- **Tests**: 17/17 grün.

### 10.4 Parser-Entscheidung (beurteilt am 2025-er Stand, gilt weiter)
**Mini-Parser + Whitelist bleibt.** Kontrolliertes kleines Tag-Vokabular,
0 Dependencies, vollständig vorhersagbar, kein XSS-Fall. Migrations-Auslöser
(`markdown-it`, ~14 kB, `parse()`-API bleibt gleich): mehr Inline-HTML/Attribute,
Fussnoten, Mathematik, CommonMark-Edge-Cases, Plugin-Bedarf. `DOMPurify` erst
bei beliebigem HTML.
