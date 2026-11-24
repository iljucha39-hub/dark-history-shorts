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
  "voice": {"model": "de_DE-thorsten-high", "lengthScale": 1.0},
  "music": {"seed": 1347, "key": "d"},          // oder {"file": "audio/music/eigene.mp3"}
  "pronunciations": {"Vlad": "Wlad"},           // nur für die Aussprache
  "scenes": [ { "narration": "…", "emphasis": ["Tod"], "visual": { … } } ]
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

**Kamera** (`camera`): `pushIn`, `pullOut`, `panLeft`, `panRight`, `tiltUp`, `tiltDown`, `drift`, `punchIn`
**Stimmung** (`mood`): `night`, `blood`, `fog`, `fire`, `storm`, `gold`

**Figuren** (`characters: [{kind, action, x, scale, facing, travel}]`)
- `kind`: `knight`, `soldier`, `archer`, `king`, `queen`, `monk`, `peasant`, `plagueDoctor`, `executioner`, `noble`, `viking`
- `action`: `idle`, `walk`, `run`, `march`, `fight`, `point`, `cower`, `raiseArm`, `pray`
- `x`: 0–1 (Position), `facing`: `left`/`right`, `travel`: Laufstrecke in Bildbreiten

## Regeln
- 6–10 Szenen, Gesamtdauer 35–60 s (≈ 95–135 Wörter). Liegt die Sprachdauer außerhalb,
  wird das Sprechtempo automatisch um bis zu ±15 % angepasst.
- Szene 1 ist der Hook – kurz und sofort spannend.
- `emphasis`-Wörter werden in den Untertiteln rot hervorgehoben.
