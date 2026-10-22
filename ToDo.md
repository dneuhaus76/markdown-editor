# ToDo

- [ ] **GPL3-Einschätzung dokumentieren**: GPL3 + Vanilla-JS-SPA passt, aber GPL3 ist
      Copyleft für *Weiterverbreitung* – bei einer reinen Browser-App greift es praktisch
      erst, wenn jemand den Quellcode weiterverteilt (keine Server-Komponente → AGPL
      wäre hier übertrieben). Kurz im README oder PLAN.md vermerken.
- [ ] **Token rotieren (optional)**: GitHub-Token liegt im Klartext in
      `/home/appuser/.config/gitconfig` (`insteadOf`-Regel) und in der Env `GIT_TOKEN`.
      Bei Rotation beide Stellen aktualisieren.
- [ ] **Live-Demo-Link setzen**: GitHub-Pages oder den nginx-Container
      (raspi5, Port 8080) als Demo-Link in die Repo-Description / README eintragen.
