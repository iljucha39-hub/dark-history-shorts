# Einrichtung: manuelle Schritte (alles per iPhone)

Diese Schritte kann Claude nicht selbst erledigen. Alle gehen im mobilen Browser (Safari) auf github.com.

## 1. GitHub Actions
Keine Einstellung nötig: Actions sind bei neuen Repositories aktiv, und der Workflow fordert
die benötigten Schreibrechte (für das Release mit MP4-Download) selbst an.
Nur falls ein Lauf mit „Resource not accessible by integration“ beim Release scheitert:
`github.com/<du>/dark-history-shorts/settings/actions` öffnen (Safari: **aA** → „Desktop-Website
anfordern“), ganz unten „Workflow permissions“ → **Read and write permissions** → **Save**.

## 2. Video herunterladen
- **Release (empfohlen):** `github.com/<du>/dark-history-shorts/releases` → Video antippen →
  MP4 öffnen → Teilen → **Video sichern** (landet in Fotos).
- **Artifact:** Actions → Lauf → ganz unten „Artifacts“ → ZIP lädt in die Dateien-App →
  antippen zum Entpacken. (Artifacts werden nach 30 Tagen gelöscht.)

> Hinweis: Ist das Repository **öffentlich**, sind auch die Releases öffentlich sichtbar.
> Bei privaten Repositories sind Actions-Minuten begrenzt (Free-Plan: 2.000 Min./Monat;
> ein Video braucht ca. 8–15 Minuten). Öffentliche Repositories haben unbegrenzte Minuten.

## 3. Workflow manuell starten (optional)
Actions → „Video produzieren“ → **Run workflow** → IDs eintragen.
Erst möglich, wenn der Workflow auf dem Standard-Branch (main) liegt. Bis dahin startet
er automatisch bei jedem Push eines freigegebenen Skripts.

## Lizenzen
- **Remotion**: kostenlos für Einzelpersonen und Firmen bis 3 Mitarbeitende; darüber
  ist eine Firmenlizenz nötig (remotion.dev/license).
- **Piper** (GPL-3.0) und Stimme **Thorsten** (Datensatz laut Model Card CC0) – vor kommerzieller Nutzung die Model Card auf huggingface.co/rhasspy/piper-voices prüfen.
- **Schriften** Cinzel, Montserrat – SIL Open Font License.
- **Kartendaten** Natural Earth – Public Domain.
- **Musik** wird synthetisch erzeugt – keine Rechte Dritter.
