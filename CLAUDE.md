# Dark History Shorts – Arbeitsanweisungen für Claude

Der Nutzer arbeitet **ausschließlich auf dem iPhone** (Claude Code App + GitHub im Browser).
Niemals Terminal-Befehle vom Nutzer verlangen. Alles, was ausgeführt werden muss, führt Claude aus.
Kommunikation auf Deutsch, kurz und mobilfreundlich.

## Ablauf „NEUES VIDEO“

Wenn der Nutzer `NEUES VIDEO` schreibt (optional mit Themenwunsch):

1. **Thema**: 3 Themenvorschläge (Dark History: Mittelalter, Kriege, Mysterien, vergessene Personen,
   unglaubliche Fakten). Bereits produzierte Themen in `scripts/` nicht wiederholen.
   Hat der Nutzer ein Thema genannt, direkt Schritt 2.
2. **Recherche**: Fakten per Websuche prüfen. Nur belegbare Aussagen; Umstrittenes mit
   „angeblich“, „laut Chronist …“ kennzeichnen. Quellen in `sources` eintragen.
3. **Skript** `scripts/<id>.json` mit `"status": "draft"` schreiben (Format: `docs/SKRIPT-FORMAT.md`):
   - 6–10 Szenen, 85–115 Wörter gesamt (≈ 35–60 s mit Stimme X2)
   - Szene 1 = Hook (max. ~12 Wörter, sofort packend), letzte Szene = kurzer Abschluss/CTA
   - Jahreszahlen als Ziffern sind ok (1100–1999 werden korrekt ausgesprochen)
   - Stimme immer: `"voice": {"engine": "chatterbox", "exaggeration": 0.9, "cfgWeight": 0.3, "effect": "none", "seed": <Zahl>}`
     (vom Nutzer gewählte Stimme „X2“)
4. `node pipeline/validate.mjs scripts/<id>.json` und `node pipeline/preview.mjs scripts/<id>.json`
   (lokal mit `REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell`) ausführen,
   Vorschaubild `output/<id>/vorschau.jpg` ansehen und dem Nutzer Skript + Vorschau zeigen.
5. **Freigabe**: Erst wenn der Nutzer zustimmt, `"status": "approved"` setzen, committen und pushen.
   Der Push startet den Workflow `.github/workflows/produce-video.yml` automatisch.
6. Workflow-Lauf mit den GitHub-Tools verfolgen; am Ende dem Nutzer den Release-Link
   (`…/releases/tag/video-<id>`) bzw. den Link zum Actions-Lauf geben.

## Technik-Kurzüberblick

- `scripts/*.json` – Videoaufträge (Dateien mit `_` am Anfang werden ignoriert)
- `pipeline/` – Produktion: `validate.mjs`, `tts.py` (Piper), `music.py`, `produce.mjs`, `preview.mjs`, `plan.mjs`
- `src/` – Remotion-Komposition, Kamera, Untertitel; `scenes/` – 2D-Szenenbibliothek
- `assets/` – Remotion-Public-Ordner (Fonts); `assets/generated/` wird erzeugt
- Stimmen: Chatterbox (Standard, `pipeline/tts_chatterbox.py`, Wort-Zeiten via faster-whisper) oder Piper.
  Modelle kommen von huggingface.co – im Claude-Cloud-Container blockiert, in GitHub Actions verfügbar.
  Lokal deshalb nur `PLACEHOLDER_TTS=1` (Stille) zum Testen.
- Neu rendern ohne Skriptänderung: `[render:<id>]` oder `[render:all]` in die Commit-Nachricht schreiben.
- Keine Modellnamen in Commits/Code erwähnen.
