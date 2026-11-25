#!/usr/bin/env python3
"""
Erzeugt Stimmproben (MP3) zum Vergleichen am iPhone.
  python pipeline/voice_samples.py --engine piper      --out output/stimmproben
  python pipeline/voice_samples.py --engine chatterbox --out output/stimmproben
Piper: schnell, offline (ONNX). Chatterbox Multilingual (MIT): ausdrucksstärker,
deutlich langsamer auf CPU, Stimme per Referenz-Audio wählbar.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import numpy as np  # noqa: E402

TEXT = (
    "Er versetzte halb Europa in Angst – und starb in seiner Hochzeitsnacht an Nasenbluten. "
    "Attila, König der Hunnen. Selbst das Römische Reich zahlte ihm Tribut. "
    "Am nächsten Morgen finden ihn seine Wachen. Tot. Ohne eine einzige Wunde."
)

# Piper: (Kennung, Beschreibung, Modell, Sprecher, Tempo, Effekt, noiseScale, noiseW)
PIPER = [
    ("K", "Piper Karlsson (männlich)", "de_DE-karlsson-low", None, 1.05, "dark", 0.85, 1.0),
    ("P", "Piper Pavoque (männlich)", "de_DE-pavoque-low", None, 1.05, "dark", 0.85, 1.0),
    ("R", "Piper Ramona (weiblich)", "de_DE-ramona-low", None, 1.05, "room", 0.85, 1.0),
    ("M1", "Piper MLS Sprecher 1", "de_DE-mls-medium", 1, 1.05, "dark", 0.85, 1.0),
    ("M2", "Piper MLS Sprecher 2", "de_DE-mls-medium", 5, 1.05, "dark", 0.85, 1.0),
    ("M3", "Piper MLS Sprecher 3", "de_DE-mls-medium", 9, 1.05, "dark", 0.85, 1.0),
]

# Chatterbox: (Kennung, Beschreibung, Referenzstimme, exaggeration, cfg_weight, Effekt)
# Referenz "default" = eingebaute Stimme; sonst wird die Klangfarbe aus einer Piper-Probe übernommen.
# (Kennung, Beschreibung, Referenzstimme, exaggeration, cfg_weight, Effekt, Tempo)
CHATTERBOX = [
    ("E1", "episch, Tempo 1,3× (vs. bisher ~1,2×)", "de_DE-thorsten-high", 0.7, 0.5, "epic", 1.3),
    ("E2", "episch, Tempo 1,45×", "de_DE-thorsten-high", 0.7, 0.5, "epic", 1.45),
    ("E3", "episch, Tempo 1,6×", "de_DE-thorsten-high", 0.7, 0.5, "epic", 1.6),
    ("E4", "noch epischer (mehr Ausdruck), Tempo 1,45×", "de_DE-thorsten-high", 0.85, 0.45, "epic", 1.45),
    ("E5", "Vergleich: ohne Tiefe (wie V2), Tempo 1,45×", "de_DE-thorsten-high", 0.7, 0.5, "clear", 1.45),
]


def effects() -> dict:
    return json.loads((Path(__file__).parent / "voice-effects.json").read_text(encoding="utf-8"))


def to_mp3(wav: Path, mp3: Path, fx: str, sr: int):
    filt = effects()[fx].replace("{sr}", str(sr)) + ",loudnorm=I=-16:TP=-1.5"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af", filt, "-ar", "44100",
                    "-b:a", "160k", str(mp3)], check=True)


def piper_render(model: str, speaker, scale: float, noise, noise_w, voice_dir: Path, out_wav: Path, cache: dict) -> int:
    from tts import display_tokens, load_voice, speaker_id, split_sentences, synth_sentence, write_wav

    if model not in cache:
        cache[model] = load_voice(model, voice_dir)
    voice = cache[model]
    spk = speaker_id(voice, speaker)
    parts = []
    sr = voice.config.sample_rate
    for sent in split_sentences(display_tokens(TEXT)):
        audio, _, sr = synth_sentence(voice, " ".join(sent), scale, spk, noise, noise_w)
        last = sent[-1]
        pause = 0.65 if last.endswith(("…", "...")) else 0.35 if last.endswith("?") else 0.22
        parts += [audio, np.zeros(int(pause * sr), dtype=np.float32)]
    write_wav(out_wav, np.concatenate(parts), sr)
    return sr


def run_piper(out: Path, voice_dir: Path, lines: list[str]):
    cache: dict = {}
    for key, desc, model, speaker, scale, fx, noise, noise_w in PIPER:
        try:
            wav = out / f"{key}.wav"
            sr = piper_render(model, speaker, scale, noise, noise_w, voice_dir, wav, cache)
            to_mp3(wav, out / f"Probe-{key}.mp3", fx, sr)
            wav.unlink()
            setting = {"model": model, "lengthScale": scale, "effect": fx, "noiseScale": noise, "noiseW": noise_w}
            if speaker is not None:
                setting["speaker"] = speaker
            lines.append(f"| **{key}** | {desc} | `{json.dumps(setting, ensure_ascii=False)}` |")
            print(f"[stimmen] {key}: {desc} ✓", flush=True)
        except Exception as e:  # noqa: BLE001
            lines.append(f"| {key} | {desc} | ❌ {e} |")
            print(f"[stimmen] {key}: FEHLER {e}", flush=True)


def run_chatterbox(out: Path, voice_dir: Path, lines: list[str]):
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    t0 = time.time()
    model = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    print(f"[chatterbox] Modell geladen in {time.time() - t0:.0f}s", flush=True)
    cache: dict = {}
    for key, desc, ref, exag, cfg, fx, tempo in CHATTERBOX:
        try:
            prompt = None
            if ref != "default":
                m, _, spk = ref.partition(":")
                prompt = out / f"ref-{key}.wav"
                piper_render(m, int(spk) if spk.isdigit() else (spk or None), 1.0, None, None, voice_dir, prompt, cache)
            t = time.time()
            wav = model.generate(TEXT, language_id="de", audio_prompt_path=str(prompt) if prompt else None,
                                 exaggeration=exag, cfg_weight=cfg)
            audio = wav.squeeze(0).cpu().numpy().astype("float32")
            if tempo != 1.0:
                from tts import time_stretch
                audio = time_stretch(audio, model.sr, 1.0 / tempo)
            secs = len(audio) / model.sr
            raw = out / f"{key}.wav"
            from tts import write_wav
            write_wav(raw, audio, model.sr)
            to_mp3(raw, out / f"Probe-{key}.mp3", fx, model.sr)
            raw.unlink()
            if prompt:
                prompt.unlink()
            took = time.time() - t
            setting = {"engine": "chatterbox", "reference": ref if ref == "default" else f"piper:{ref}",
                       "exaggeration": exag, "cfgWeight": cfg, "effect": fx, "speed": tempo}
            lines.append(f"| **{key}** | {desc} – {secs:.0f} s Audio in {took:.0f} s Rechenzeit | `{json.dumps(setting, ensure_ascii=False)}` |")
            print(f"[chatterbox] {key}: {desc} ✓ ({secs:.1f}s Audio, {took:.0f}s)", flush=True)
        except Exception as e:  # noqa: BLE001
            lines.append(f"| {key} | {desc} | ❌ {e} |")
            print(f"[chatterbox] {key}: FEHLER {e}", flush=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", choices=["piper", "chatterbox"], default="piper")
    ap.add_argument("--out", default="output/stimmproben")
    ap.add_argument("--voice-dir", default=".voices")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    lines = [f"### {args.engine}", "", "| Probe | Beschreibung | Einstellung |", "|---|---|---|"]
    if args.engine == "piper":
        run_piper(out, Path(args.voice_dir), lines)
    else:
        run_chatterbox(out, Path(args.voice_dir), lines)
    (out / f"stimmproben-{args.engine}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
