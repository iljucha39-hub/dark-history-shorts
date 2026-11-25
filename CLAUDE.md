# Dark History Shorts – Arbeitsanweisungen für Claude

Der Nutzer arbeitet **ausschließlich auf dem iPhone** (Claude Code App + GitHub im Browser).
Niemals Terminal-Befehle vom Nutzer verlangen. Alles, was ausgeführt werden muss, führt Claude aus.
Kommunikation auf Deutsch, kurz und mobilfreundlich.

## Ablauf „NEUES VIDEO“

Wenn der Nutzer `NEUES VIDEO` schreibt (optional mit Themenwunsch):

1. **Thema**: 3 Themenvorschläge, bevorzugt aus `docs/THEMEN.md` (Themenvorrat). Bereits produzierte
   Themen nicht wiederholen; nach der Produktion das Thema dort abhaken (`[x]` + Skript-ID).
   Hat der Nutzer ein Thema genannt, direkt Schritt 2.
2. **Recherche**: Fakten per Websuche prüfen. Nur belegbare Aussagen; Umstrittenes mit
   „angeblich“, „laut Chronist …“ kennzeichnen. Quellen in `sources` eintragen.
3. **Skript** `scripts/<id>.json` mit `"status": "draft"` schreiben (Format: `docs/SKRIPT-FORMAT.md`):
   - **Shorts-Stil (Reichweite!)**: 7–10 Szenen, **80–100 Wörter (≈ 30–40 s bei Stimme E1)**, kurze Sätze, jede Szene 1 Satz.
   - **Hook (Szene 1)**: schockierender Fakt oder Frage in den ersten Worten, max. ~14 Wörter;
     der Titeltext im Bild (`visual.text`) ist die Kernbehauptung („NIEMAND AN BORD“), nicht nur der Name.
     Hook-Muster: Widerspruch/Wendung („…und alle überlebten“), absurdes Detail („an Nasenbluten“),
     offene Frage/Spannung („Was dann geschah, …“). Keine Einleitung, kein Datum am Anfang.
   - **Story statt Fakten**: eine Hauptfigur, ein Konflikt (Verrat, Übermacht, Rache, Befehl), eine Wendung.
     Gern ein echtes Zitat als Hook („Ich befehle euch nicht anzugreifen – ich befehle euch zu sterben!“).
   - **Szene 1 = Cover**: `"type": "closeup"` (Profil-Silhouette vor großer Sonne) mit
     `"hook": {"top": "<2–3 Wörter weiß>", "main": "<1–2 Wörter groß in Rot>"}` – das ist zugleich das Vorschaubild.
   - **Hell & warm**: Stimmungen `sunset`/`dusk` bevorzugen; `night`/`storm` nur gezielt. Hauptfigur mehrfach als `closeup`.
   - **Kein „Folge …“-Abschluss.** Der letzte Satz führt inhaltlich zurück zum Hook (Loop-Effekt).
   - Jahreszahlen als Ziffern sind ok (1100–1999 werden korrekt ausgesprochen)
   - Stimme immer (vom Nutzer gewählte Stimme „E1“: männlich, episch, ca. 1,2× schneller als vorher, durchgesprochen, ohne Hall):
     `"voice": {"engine": "chatterbox", "reference": "piper:de_DE-thorsten-high", "exaggeration": 0.7, "cfgWeight": 0.5, "effect": "epic", "speed": 1.3, "pauses": "tight", "seed": <Zahl>}`
4. `node pipeline/validate.mjs scripts/<id>.json` und `node pipeline/preview.mjs scripts/<id>.json`
   (lokal mit `REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell`) ausführen,
   Vorschaubild `output/<id>/vorschau.jpg` ansehen und dem Nutzer Skript + Vorschau zeigen.
5. **Freigabe**: Erst wenn der Nutzer zustimmt, `"status": "approved"` setzen, committen und pushen.
   Der Push startet den Workflow `.github/workflows/produce-video.yml` automatisch.
   Mehrere Videos auf einmal: mehrere Skripte freigeben und in einem Push committen –
   der Workflow rendert sie parallel (max. 2 gleichzeitig).
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
