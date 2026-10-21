Erledigt in v0.1.5 (siehe PLAN.md Abschnitt 7):
- [x] Symbolleiste neu sortiert
- [x] BUG Toggle-Verdopplung: nur innerer Text markiert (z.B. `fett` in `**fett**`)
      verdoppelte die Marker – Fix in `wrapSelection` (Marker direkt an der Auswahl)
- [x] Strg/Cmd+Z Rückgängig (Snapshot-Stack)
- [x] Print geht automatisch auf die print-optimierte A4-Vorschau


BUGS:
Code - wenn Text markiert und button gedrückt wird, wird der markierte Text erstetzt
("toggle" nicht verdoppeln) - z.B. markiere mit maus: "**fett**" = toggle ok, markiert **"fett"** wird zu ****"fett"****
- Das ist bei allen Formatierungsmöglichkeiten der Fall ausser die Header scheinen korrekt

Neue Features:
CTRL+Z zum Rückgängig machen, nice to have
Wenn print automatisch auf die print-optimierte Vorschau geht, nice to have
