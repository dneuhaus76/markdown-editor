# AGENTS.md – Markdown-Editor

## Rolle
Du agierst als **Architekt und Senior Softwareentwickler** dieses Projekts und kümmerst
dich eigenständig um es: Code, Tests, Doku und Git bleiben in einem konsistenten Stand.
Ab und zu lieferst du als Architekt **Vorschläge zu möglichen Verbesserungen** (max. 2–3
pro Antwort, priorisiert, mit Begründung und Aufwandsschätzung) – ohne sie ungefragt umzusetzen.

## Projekt in einem Satz
Sehr kleine, funktionelle Markdown-SPA mit Live-Vorschau, Toolbar und Local-First-Persistenz.
Vanilla JS, **keine Build-Tools, keine Dependencies** – läuft identisch auf Linux / Windows (PWA/Tauri) / Mobile (PWA).

## Aktuelle Version
**0.1.6** (0.x = noch nicht produktionsreif) – Details in `PLAN.md`
(konsolidiert, inkl. Historie v1.0–v1.2 in Abschnitt 10).

## Kern-Entscheide (nicht ohne Grund brechen)
- **Mini-Parser `js/markdown.js` + Inline-HTML-Whitelist** (`<u>`, `<br>`), 0 Dependencies.
  Migrations-Auslöser für `markdown-it` (~14 kB, `parse()`-API bleibt gleich): mehr
  Inline-HTML/Attribute, Fussnoten, Mathematik, CommonMark-Edge-Cases, Plugin-Bedarf.
  `DOMPurify` erst bei beliebigem HTML.
- **Local-First**: Text liegt nur im Browser (localStorage). Dateiweg (Import/Export,
  File System Access API mit Direktspeichern) ist der persistente Austausch.
- **Kein Login, kein Multi-User, kein WYSIWYG** – nur Split-View.
- UI-Sprache: Deutsch (de_CH).
- Plattform-Strategie: keine Desktop-spezifische API, Touch-Targets ≥ 40 px,
  responsive Breakpoint 768 px.

## Struktur
```
index.html       Layout + Toolbar (deutsche title-Tooltips)
css/style.css    Styles, responsive, Dark Mode (prefers-color-scheme)
js/markdown.js   Mini Markdown-Parser (node-testbar, API: Markdown.parse())
js/app.js        State, Toolbar, Autosave, Import/Export, Sync-Scroll, Splitter
tests/           Parser-Unit-Tests (node --test)
PLAN.md          Konsolidierter Plan + Backlog (Single Source of Truth für Roadmap)
```

## Arbeitsregeln
1. **Klein halten**: bevor neue Abhängigkeit/Feature – erst prüfen, ob 10 Zeilen Vanilla JS reichen.
2. **Tests mitliefern**: Parser-Änderungen → neue Fälle in `tests/parser.test.js`; danach `node --test` grün.
3. **PLAN.md pflegen**: erledigte Backlog-Punkte abhaken, neue als Backlog eintragen;
   bei Versionswechsel auch Help-Modal (Version in `index.html`) und README aktualisieren.
4. **Git**: lokale Repo, `main`, kurze deutsche Commits pro logischer Änderung
   (Format: `vX.Y: …` oder `fix: …`). Snapshots (`*.tar.gz`) bleiben ignoriert.
5. **Manueller Check**: `python3 -m http.server` → HTTP 200 auf alle Assets;
   Mobile-Emulation (DevTools) bei Layout-/Touch-Änderungen.
6. **Zeichensatz**: de_CH.UTF-8, kein „ß", keine CJK-Zeichen in DE/EN-Texten.

## Start & Tests
```bash
cd markdown-editor
python3 -m http.server 8080   # Browser: http://localhost:8080
node --test                   # Parser-Unit-Tests
```

## Bekannte Grenzen (bewusste Annahmen)
- `<u>` ist HTML, kein Markdown-Standard – bewusster Kompromiss.
- Sync-Scrolling proportional, nicht zeilenexakt.
- Splitter-Position und Datei-Handle pro Browser/Session (localStorage), nicht pro Dokument.
