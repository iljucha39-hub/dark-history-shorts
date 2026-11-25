# Skript-Format (`scripts/<id>.json`)

Vollständiges Beispiel: [`scripts/beispiel-pest-1347.json`](../scripts/beispiel-pest-1347.json)

```json
{
  "id": "pest-1347",                 // = Dateiname, nur a-z 0-9 -
  "title": "Der Schwarze Tod erreicht Europa",
  "status": "draft",                 // "approved" = wird beim Push gerendert
  "category": "Mittelalter",
  "description": "Text für TikTok/YouTube",
  "hashtags": ["darkhistory", "geschichte"],
  "sources": ["Quelle 1", "Quelle 2"],
  // Standard (Stimme „E1“): episch, schnell, durchgesprochen
  "voice": {"engine": "chatterbox", "reference": "piper:de_DE-thorsten-high", "exaggeration": 0.7,
            "cfgWeight": 0.5, "effect": "epic", "speed": 1.3, "pauses": "tight", "seed": 1347},
  // Alternative Piper (schneller, monotoner):
  // "voice": {"model": "de_DE-thorsten-high", "lengthScale": 1.08, "noiseScale": 0.85,
  //           "noiseW": 1.0, "effect": "dark", "speaker": "whisper"}
  "music": {"seed": 1347, "key": "d"},          // oder {"file": "audio/music/eigene.mp3"}
  "pronunciations": {"Vlad": "Wlad"},           // nur für die Aussprache
  "scenes": [ { "narration": "…", "emphasis": ["Tod"], "pace": 1.1, "visual": { … } } ]
}
```

## Szenentypen (`visual.type`)

| Typ | Inhalt | Wichtige Felder |
|---|---|---|
| `title` | Hook: Text schlägt Buchstabe für Buchstabe ein, Blitz, Glut | `text`, `subtext`, `characters` |
| `castle` | Burg bei Nacht, Fledermäuse, Nebel, flackernde Fenster | `characters`, `fire`, `rain`, `lightning` |
| `village` | Fachwerkdorf, Rauch, Figuren; mit `fire: true` brennend | `characters`, `fire`, `rain` |
| `battle` | Zwei Heere stürmen aufeinander, Pfeilhagel, Banner, Kamerawackeln | `characters[0]`/`[1]` = Figurentyp links/rechts |
| `map` | Echte Karte (Natural Earth), animierte Route, Marker, Ausbreitung | `map.bounds`, `map.markers`, `map.route`, `map.spreadFrom`, `map.title` |
| `portrait` | Große Figur mit Namensschild, Lichtstrahlen | `characters[0]`, `text`, `subtext` |
| `document` | Pergament mit Zahl/Fakt, Kerze, Siegel | `text`, `subtext` |
| `dungeon` | Kerker, Ketten, Fackel, Gefangener | `characters`, `fire` |
| `sea` | Sturm auf See, schaukelndes Schiff, Regen, Blitze | `rain`, `lightning` |
| `closeup` | Große Profil-Silhouette (Kopf & Schultern) vor riesiger Sonne/Mond, optional Flaggen | `characters[0]`, `flags: ["#c8102e"]` |

**Cover-Titel** (`visual.hook`, für Szene 1): `{"top": "GESTORBEN AN", "main": "NASENBLUTEN"}` – dicke Schrift,
oben weiß, unten groß in Rot. Während der Hook-Szene werden die Untertitel ausgeblendet.

**Kamera** (`camera`): `pushIn`, `pullOut`, `panLeft`, `panRight`, `tiltUp`, `tiltDown`, `drift`, `punchIn`
**Stimmung** (`mood`): `sunset` (Abendrot, Sonne), `dusk` (Dämmerung, lila), `night`, `blood`, `fog`, `fire`, `storm`, `gold`

**Figuren** (`characters: [{kind, action, x, scale, facing, travel}]`)
- `kind`: `knight`, `soldier`, `archer`, `king`, `queen`, `monk`, `peasant`, `plagueDoctor`, `executioner`, `noble`, `viking`
- `action`: `idle`, `walk`, `run`, `march`, `fight`, `point`, `cower`, `raiseArm`, `pray`
- `x`: 0–1 (Position), `facing`: `left`/`right`, `travel`: Laufstrecke in Bildbreiten

## Regeln
- `"pauses": "tight"` = durchgesprochen (fast keine Pausen), `"normal"` = mit Spannungspausen.
- Effekte: `none`, `clear`, `epic` (etwas tiefer/voller, kein Hall), `dark`/`deep`/`room` (mit Hall).
- Shorts-Stil: 7–10 Szenen, Ziel 30–40 s (≈ 80–100 Wörter mit Stimme E1). Erlaubt sind 28–45 s;
  außerhalb wird das Tempo automatisch um bis zu ±15 % angepasst.
- Szene 1 ist der Hook – Schock-Fakt oder Frage sofort; der Bildtitel ist die Kernaussage.
- Kein „Folge …“ am Ende: der letzte Satz führt zurück zum Anfang (Loop).
- Längere Szenen werden automatisch alle ~2,5 s mit neuer Kameraeinstellung „geschnitten“.
- `pace` pro Szene: 1.1 = 10 % langsamer (Enthüllung), 0.95 = schneller (Action).
- Satzende mit `…` = dramatische Pause (0,65 s), mit `?` = kurze Spannungspause.
- `emphasis`-Wörter werden in den Untertiteln rot hervorgehoben.
