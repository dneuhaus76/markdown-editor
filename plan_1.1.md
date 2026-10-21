# Plan 1.1: Delta zu plan.md (Markdown-Editor)

Basis: `plan.md` (v1.0, alle Meilensteine erledigt). Dieses Dokument beschreibt nur die Anpassungen.

## 1. Synchrones Scrollen (Editor ↔ Vorschau)
- Beide Bereiche bleiben beim Scrollen immer auf derselben relativen Position.
- Umsetzung: proportionales Mapping
  - `ratio = scrollTop / (scrollHeight - clientHeight)` (Quelle)
  - `Ziel.scrollTop = ratio * (Ziel.scrollHeight - Ziel.clientHeight)`
- Bidirektional: Scrollen im Editor scrollt die Vorschau und umgekehrt.
- Reentrancy-Schutz: Flag (`isSyncing`), das beim Setzen von `scrollTop` gesetzt wird, damit der ausgelöste `scroll`-Event nicht zurückkopiert (Feedback-Loop).
- Event-Debounce/`requestAnimationFrame`, um bei schnellen Scrollbewegungen nicht zu ruckeln.
- Mobile (nur eine Ansicht sichtbar): Sync inaktiv, kein Aufwand.

## 2. Toolbar-Actions als Toggle
Heute: Formatierung wird bei erneutem Klick doppelt gewickelt (z.B. `****Text****`).
Ziel: zweiter Klick entfernt die gleiche Formatierung (Toggle), dritter setzt sie wieder.

- **Inline-Wrap** (Fett, Kursiv, Durchgestrichen, Inline-Code, Unterline):
  - Auswahl bereits exakt von `**…**` umschlossen → Marker entfernen.
  - Sonst wickeln wie bisher.
  - Sonderfall: Cursor ohne Auswahl → Toggle auf dem aktuellen Wort, falls vorhanden.
- **Zeilenformatierung** (H1–H3, Liste):
  - Zeile beginnt bereits mit demselben Präfix (z.B. `## `) → Präfix entfernen.
  - Anderes Präfix derselben Art vorhanden (z.B. `# ` bei Klick auf H2) → ersetzen.
- **Codeblock / Tabelle**: bleiben einfügen (kein Toggle), da Template-Insertion.
- **Link/Bild**: bleiben wie bisher (URL wird abgefragt).

## 3. Neue Toolbar-Actions
| Action | Markdown | HTML-Ergebnis | Anmerkung |
|--------|----------|---------------|-----------|
| Unterline | `<u>Text</u>` | `<u>Text</u>` | Kein natives Markdown-Tag; HTML-Inline wird erlaubt (s. 4). Toolbar-Knopf `<u>U</u>`. |
| Zeilenumbruch | `<br>` | `<br>` | Knopf `⏎` / «br»; fügt `<br>` an Cursor-/Auswahlende ein (kein Wrap). |
| Trennlinie | `---` | `<hr>` | Parser unterstützt `---` bereits; nur Toolbar-Knopf fehlt (neue Gruppe mit Tabelle/Codeblock). |

## 4. Parser-Erweiterung (js/markdown.js)
- **Inline-HTML-Whitelist** für: `<u>`, `</u>`, `<br>`, `<br/>` (klein halten, nur diese drei).
  - Escape-Schutz: erst nach HTML-Escape der restlichen Inhalte einbauen, damit die Whitelist-Tags nicht als Text erscheinen.
  - `<br>` in Absätzen/Listen/Zellen → Zeilenumbruch; `---` bleibt Trennlinie (kein Konflikt, da block- vs. inline).
- **Unterline** wird im Vorschau-CSS nicht extra gestylt (Browser-Default).

## 5. Tests (tests/parser.test.js ergänzen)
- `<u>Text</u>` → `<u>Text</u>` (auch innerhalb von Absätzen und Listen).
- `Zeile 1<br>Zeile 2` → `<p>Zeile 1<br>Zeile 2</p>`.
- Unbekannte Inline-Tags bleiben escaped (z.B. `<div>` → `&lt;div&gt;`).
- `---` → `<hr>` (existiert bereits, bleibt grün).
- Toolbar-Toggle: manuell prüfen (kein Unit-Test-Framework für DOM in v1.1).

## 6. UI-Änderungen (index.html)
- Neue Knöpfe in der Toolbar:
  - Gruppe Text: `U` (Unterline) neben S.
  - Gruppe Struktur: `—` (Trennlinie) neben Tabelle, `br` (Zeilenumbruch) neben Inline-Code.
- `title`-Tooltips auf Deutsch (de_CH).

## 7. Splitter: feine Trennlinie + verstellbar + dezenter Scrollbalken
- **Trennlinie feiner**: `.pane-editor` hat heute `border-right: 1px solid var(--border)` – bleibt 1 px, Farbe etwas dezenter (z.B. `color-mix` mit 50 % Border-Farbe).
- **Verstellbare Breite (Splitter)**:
  - Neuer Div `.splitter` zwischen Editor und Vorschau (breite 6 px, unsichtbar, `cursor: col-resize`, greift die 1-px-Linie optisch).
  - Drag mit `pointerdown/pointermove/pointerup` (funktioniert auch mit Touch).
  - Breite via CSS-Variable `--split` auf `.panes` (`grid-template-columns: var(--split) 1fr`), Clamp z.B. 20 %–80 %.
  - Doppelklick auf Splitter → zurück auf 50/50.
  - Position in localStorage speichern (neben dem Auto-Save-Text).
  - Mobile (Single-Pane): Splitter `display: none`.
- **Scrollbalken ausblenden (Editor)**:
  - `textarea#editor { scrollbar-width: none; }` (Firefox) + `#editor::-webkit-scrollbar { display: none; }` (Chromium/Safari).
  - Scrollen bleibt voll funktionsfähig (Mausrad/Touch/Tasten); der Balken in der Mitte verschwindet.
  - Vorschau-Scrollbar bleibt sichtbar (orientiert beim Lesen), optional gleich behandeln – Default: sichtbar lassen.

## Meilensteine v1.1
1. [x] Sync-Scrolling (bidirektional, Echo-Erkennung statt Flag)
2. [x] Toggle-Logik für Inline-Wrap + Zeilenpräfixe
3. [x] Toolbar: Unterline, br, Trennlinie
4. [x] Parser: Inline-HTML-Whitelist (`u`, `br`)
5. [x] Tests ergänzen, `node --test` grün (16/16)
6. [x] Splitter (drag, Clamp 20–80 %, Doppelklick-Reset, Persistenz) + feine Trennlinie
7. [x] Editor-Scrollbar ausblenden (Firefox + WebKit)

## 8. Parser-Entscheidung (beurteilt am 2025-er Stand)
**Entscheid: Mini-Parser + Whitelist bleibt.**
- Begründung: kontrollierter, kleiner Tag-Vokabular (`u`, `br`), 0 Dependencies, Verhalten vollständig vorhersagbar, kein XSS-Fall.
- Migrations-Auslöser (dann Tausch gegen `markdown-it`, ~14 kB, API `parse()` bleibt gleich → nur `js/markdown.js` wird ersetzt):
  - mehr Inline-HTML / Attribute gewünscht,
  - Fussnoten, Mathematik oder CommonMark-Edge-Cases,
  - Plugin-Bedarf (z.B. Task-Listen, `++unterline++`).
- `DOMPurify` erst nötig, wenn beliebiges HTML erlaubt wird.

## 9. Nachträge (v1.2)
### 9.1 Zitat-Knopf `>` in der Toolbar
- Neuer Knopf `❝` (Gruppe Struktur, neben Trennlinie), Action `quote`.
- Verhalten wie `prefixLines`: Toggle auf Präfix `> ` (alle Zeilen der Auswahl); Mehrfach-Zitat (`>> `) entsteht durch zweites Klicken.

### 9.2 Ungeordnete Punkte: Einrücken / Verschachtelung
- **Problem**: `- a` + eingerücktes `  - b` wird heute flach gerendert (Einrücken geht verloren).
- **Parser**: Listen-Erkennung mit Einrückungsstufen (2 Leerzeichen oder Tab = 1 Stufe, beliebig tief). Stack-basiert: tiefere Stufe öffnet `<ul>`/`<ol>`, geringere schliesst auf.
- **CSS**: `ul, ol { padding-left: 1.4em; }` in der Vorschau, damit auch flache Listen sichtbar eingerückt sind.
- **Toolbar**: optional neuer Knopf «Einrücken»/«Ausrücken» (2 Leerzeichen vor/entfernen) – Default: ja, klein halten.

### 9.3 Datei laden / direkt speichern (bestehend, bleibt)
- Import/Export existiert bereits (Knöpfe ↥/↦ oben rechts) und wird **behalten** – in Serverbetrieb (mehrere Nutzer/Hosts) ist der Dateiweg der einzige persistente Austausch neben localStorage.
- Kleine Ergänzung: nach Import direkt Export möglich (funktioniert bereits), Tooltip-Texte präzisieren («Als .md herunterladen»).

### 9.4 Help / ? (About)
- Neuer Knopf `?` rechts in der Toolbar (vor Import/Export).
- Klick öffnet Modal (einfaches Overlay, `Esc`/Klick draussen schliesst):
  - **About**: Name, Version (v1.2), kurzer Zweck-Satz, «Local-First: Text liegt nur im Browser (localStorage)».
  - **Shortcuts**: Strg/Cmd+B Fett, Strg/Cmd+I Kursiv, Strg/Cmd+K Link, Doppelklick Splitter = 50/50.
  - **Syntax-Hilfe**: kurze Markdown-Tabelle (Fett, Kursiv, Liste, Zitat, Tabelle, Trennlinie, `<u>`, `<br>`).
- Modal-CSS: zentriert, max. 520 px, `role="dialog"`, `aria-modal`.

### 9.5 Kleiner Bugfix (beiläufig)
- Shortcut-Karte in `app.js`: heute löst **Strg+K** Kursiv aus (statt Link) und **Strg+I** tut nichts – Toolbar verspricht aber «Kursiv (Strg+I)». Fix: `i` → Kursiv, `k` → Link.

## Meilensteine v1.2
1. [x] Zitat-Knopf `>` (Toggle `> `)
2. [x] Parser: verschachtelte Listen via Einrückung + CSS-Einrücken (inkl. Ein-/Ausrücken-Knöpfe)
3. [x] Help/About-Modal (`?`-Knopf, Shortcuts, Syntax-Hilfe, Esc/Klick schliessen)
4. [x] Shortcut-Fix (Strg+I = Kursiv, Strg+K = Link)
5. [x] Tests: verschachtelte Listen (2–3 Stufen, gemischt ul/ol), `node --test` grün (17/17)

## Offene Punkte
- Unterline via `<u>` ist HTML, kein Markdown-Standard – bewusst als Kompromiss (Alternative CSS-Klasse `~~~` würde mit Code kollidieren).
- Sync-Scrolling ist proportional, nicht zeilenexakt (Zeilenexakt bräuchte eine Zeilen-Mapping-Tabelle – für v1.1 zu aufwendig).
- Splitter-Position wird pro Browser/Host gespeichert (localStorage), nicht pro Dokument.
