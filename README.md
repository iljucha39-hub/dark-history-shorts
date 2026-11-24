# Dark History Shorts

Automatisierte Produktion von TikTok-/YouTube-Shorts (9:16, 1080×1920, 30 FPS, 35–60 s)
im düsteren 2D-Cartoon-Stil – komplett in der Cloud, bedienbar vom iPhone.

**Ablauf:** Claude Code (iPhone) → `NEUES VIDEO` → Thema, Recherche, Skript, Vorschau →
Freigabe → Push → GitHub Actions rendert → MP4 als Release/Artifact zum Download.

## Pipeline

| Schritt | Werkzeug | Datei |
|---|---|---|
| Skript prüfen (6–10 Szenen, Dauer) | Node | `pipeline/validate.mjs` |
| Sprachausgabe Deutsch + Wort-Zeitstempel | Piper TTS (Open Source, offline) | `pipeline/tts.py` |
| Hintergrundmusik + Impacts | numpy-Synthese | `pipeline/music.py` |
| Mix, Ducking, Lautheit −14 LUFS | FFmpeg | `pipeline/produce.mjs` |
| 2D-Animation, Kamera, Untertitel | React + Remotion | `src/`, `scenes/` |
| Filmkorn, Web-Optimierung, Prüfung | FFmpeg/ffprobe | `pipeline/produce.mjs` |
| Bericht, Cover, SRT, Beschreibung | Node | `output/<id>/` |
| Automatisierung | GitHub Actions | `.github/workflows/produce-video.yml` |

## Ordner

- `scripts/` – Videoaufträge (JSON), Format: [docs/SKRIPT-FORMAT.md](docs/SKRIPT-FORMAT.md)
- `scenes/` – 2D-Szenenbibliothek (Burg, Dorf, Schlacht, Karte, Porträt, Dokument, Kerker, See, Titel) und animierte Figuren
- `audio/` – erzeugte Sprach-/Musikspuren (`audio/music/` für eigene Musik)
- `assets/` – Schriften; `assets/generated/` wird beim Rendern erzeugt
- `subtitles/` – Wort-Zeitstempel (JSON) und SRT
- `output/` – fertige Videos, Cover, Berichte (nicht im Git; Download über Actions)
- `docs/` – [Einrichtung (manuelle Schritte)](docs/EINRICHTUNG.md)

## Status

- [x] Phase 1: Infrastruktur
- [ ] Phase 2: vollständiges Testvideo
- [ ] Phase 3: Fehlerbehebung & Qualität
- [ ] Phase 4: 2–3 Videos täglich
- [ ] Phase 5: mobile Bedienung
