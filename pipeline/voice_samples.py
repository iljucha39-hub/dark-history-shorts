#!/usr/bin/env python3
"""
Erzeugt Stimmproben (MP3) zum Vergleichen am iPhone.
  python pipeline/voice_samples.py --out output/stimmproben
Jede Variante = Stimme + Sprecher + Tempo + Effekt (pipeline/voice-effects.json).
Die gewählte Variante wird im Skript unter "voice" eingetragen.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import numpy as np  # noqa: E402

from tts import load_voice, speaker_id, synth_sentence, write_wav  # noqa: E402

TEXT = (
    "Oktober dreizehnhundertsiebenundvierzig. Schiffe laufen in Messina ein. "
    "Die Besatzung ist tot – oder liegt im Sterben. Niemand ahnt, was sie mitgebracht haben."
)

# (Kennung, Beschreibung, Modell, Sprecher, Tempo, Effekt)
VARIANTS = [
    ("A", "Aktuell: Thorsten (hoch), normal", "de_DE-thorsten-high", None, 1.0, "none"),
    ("B", "Thorsten (hoch), langsamer, tiefer + Hall", "de_DE-thorsten-high", None, 1.12, "dark"),
    ("C", "Thorsten (hoch), langsam, sehr tief + Hall", "de_DE-thorsten-high", None, 1.15, "deep"),
    ("D", "Thorsten (mittel), langsamer, tiefer + Hall", "de_DE-thorsten-medium", None, 1.1, "dark"),
    ("E", "Thorsten emotional: Flüstern + Raum", "de_DE-thorsten_emotional-medium", "whisper", 1.05, "room"),
    ("F", "Thorsten emotional: neutral, tiefer + Hall", "de_DE-thorsten_emotional-medium", "neutral", 1.1, "dark"),
    ("G", "Kerstin (weiblich), langsamer + Raum", "de_DE-kerstin-low", None, 1.08, "room"),
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="output/stimmproben")
    ap.add_argument("--voice-dir", default=".voices")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    effects = json.loads((Path(__file__).parent / "voice-effects.json").read_text(encoding="utf-8"))
    voices: dict[str, object] = {}
    lines = ["# Stimmproben", "", f"Text: „{TEXT}“", "", "| Probe | Beschreibung | Einstellung im Skript |", "|---|---|---|"]
    for key, desc, model, speaker, scale, fx in VARIANTS:
        try:
            if model not in voices:
                voices[model] = load_voice(model, Path(args.voice_dir))
            voice = voices[model]
            spk = speaker_id(voice, speaker)
            parts = []
            for sent in [s.strip() + "." for s in TEXT.split(".") if s.strip()]:
                audio, _, sr = synth_sentence(voice, sent, scale, spk)
                parts += [audio, np.zeros(int(0.22 * sr), dtype=np.float32)]
            wav = out / f"{key}.wav"
            write_wav(wav, np.concatenate(parts), sr)
            mp3 = out / f"Probe-{key}.mp3"
            filt = effects[fx].replace("{sr}", str(sr)) + ",loudnorm=I=-16:TP=-1.5"
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af", filt, "-ar", "44100",
                            "-b:a", "160k", str(mp3)], check=True)
            wav.unlink()
            setting = {"model": model, "lengthScale": scale, "effect": fx}
            if speaker:
                setting["speaker"] = speaker
            lines.append(f"| **{key}** | {desc} | `\"voice\": {json.dumps(setting, ensure_ascii=False)}` |")
            print(f"[stimmen] {key}: {desc} ✓", flush=True)
        except Exception as e:  # einzelne Stimme nicht verfügbar → weiter
            lines.append(f"| {key} | {desc} | ❌ fehlgeschlagen: {e} |")
            print(f"[stimmen] {key}: FEHLER {e}", flush=True)
    (out / "stimmproben.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
