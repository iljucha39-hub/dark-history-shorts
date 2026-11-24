#!/usr/bin/env python3
"""
Sprachsynthese mit Piper (Open Source, läuft lokal/offline in GitHub Actions).

Erzeugt pro Video:
  audio/<id>/narration.wav   – komplette Sprachspur
  audio/<id>/timeline.json   – Szenen- und Wort-Zeitstempel (Sekunden)

Wort-Zeitstempel kommen aus Pipers Phonem-Alignment (exakt). Falls das für einen
Satz nicht zuordenbar ist, werden die Wörter proportional zur Länge verteilt
(im Bericht als "geschätzt" ausgewiesen).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import wave
from pathlib import Path

import numpy as np

LEAD_IN = 0.15      # Stille vor dem ersten Wort (Hook sofort!)
SENTENCE_GAP = 0.22 # Pause zwischen Sätzen
SCENE_GAP = 0.40    # Pause zwischen Szenen
TAIL = 1.0          # Ausklang am Ende
MIN_DUR, MAX_DUR = 35.0, 60.0

PUNCT_ONLY = re.compile(r"^[\W_]+$", re.UNICODE)
SENT_END = re.compile(r"[.!?…]+[\"'»«“”)]*$")

# ---------------------------------------------------------------- Zahlen
ONES = ["", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun",
        "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn",
        "achtzehn", "neunzehn"]
TENS = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"]


def below_100(n: int) -> str:
    if n < 20:
        return ONES[n]
    t, o = divmod(n, 10)
    return (ONES[o] + "und" if o else "") + TENS[t]


def year_words(y: int) -> str:
    """1347 -> dreizehnhundertsiebenundvierzig (deutsche Jahreszahl-Aussprache)."""
    hi, lo = divmod(y, 100)
    s = below_100(hi) + "hundert"
    if lo:
        s += below_100(lo)
    return s


def spoken_form(token: str, pron: dict[str, str]) -> str:
    m = re.match(r"^([\W_]*)(.*?)([\W_]*)$", token, re.UNICODE)
    lead, core, trail = m.group(1), m.group(2), m.group(3)
    if core in pron:
        core = pron[core]
    elif re.fullmatch(r"1[1-9]\d\d", core):
        core = year_words(int(core))
    return f"{lead}{core}{trail}"


# ---------------------------------------------------------------- Text
def display_tokens(text: str) -> list[str]:
    """Wörter für die Untertitel; reine Satzzeichen (z. B. '–') hängen am Vorwort."""
    out: list[str] = []
    for tok in text.split():
        if PUNCT_ONLY.match(tok) and out:
            out[-1] = f"{out[-1]} {tok}"
        elif PUNCT_ONLY.match(tok):
            continue
        else:
            out.append(tok)
    return out


def split_sentences(tokens: list[str]) -> list[list[str]]:
    sents: list[list[str]] = []
    cur: list[str] = []
    for t in tokens:
        cur.append(t)
        if SENT_END.search(t):
            sents.append(cur)
            cur = []
    if cur:
        sents.append(cur)
    return sents


def caption_text(token: str) -> str:
    """Untertitel ohne Gedankenstriche/Klammern, Satzzeichen am Wortende bleiben."""
    return token.replace(" –", "").replace(" —", "").strip()


# ---------------------------------------------------------------- Alignment
NON_WORD_PHONEMES = {"^", "$", "_", " ", ",", ".", "!", "?", ";", ":", "—", "–", "-", "…", "\"", "'", "(", ")"}


def word_spans_from_alignment(alignments) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    pos = 0
    cur_start = None
    for a in alignments:
        ph = a.phoneme
        n = int(a.num_samples)
        if ph == " " or ph in NON_WORD_PHONEMES:
            if cur_start is not None:
                spans.append((cur_start, pos))
                cur_start = None
        else:
            if cur_start is None:
                cur_start = pos
        pos += n
    if cur_start is not None:
        spans.append((cur_start, pos))
    return spans


def speech_bounds(audio: np.ndarray, sr: int) -> tuple[int, int]:
    thr = 0.02
    idx = np.where(np.abs(audio) > thr)[0]
    if len(idx) == 0:
        return 0, len(audio)
    return max(0, idx[0] - int(0.01 * sr)), min(len(audio), idx[-1] + int(0.02 * sr))


def proportional_spans(weights: list[int], start: int, end: int) -> list[tuple[int, int]]:
    total = sum(weights) or 1
    spans = []
    pos = start
    for w in weights:
        d = int((end - start) * w / total)
        spans.append((pos, pos + d))
        pos += d
    return spans


# ---------------------------------------------------------------- Synthese
def load_voice(model: str, voice_dir: Path):
    from piper import PiperVoice  # noqa: WPS433

    path = voice_dir / f"{model}.onnx"
    if not path.exists():
        from piper.download_voices import download_voice

        voice_dir.mkdir(parents=True, exist_ok=True)
        print(f"[tts] Lade Stimme {model} herunter …", flush=True)
        download_voice(model, voice_dir)
    return PiperVoice.load(str(path), include_alignments=True)


def speaker_id(voice, speaker) -> int | None:
    """Sprecher per Name (z. B. "whisper") oder Nummer für Mehrsprecher-Stimmen."""
    if speaker is None or voice is None:
        return None
    if isinstance(speaker, int):
        return speaker
    ids = getattr(voice.config, "speaker_id_map", None) or {}
    if speaker not in ids:
        raise SystemExit(f"[tts] Sprecher '{speaker}' unbekannt. Verfügbar: {', '.join(ids) or '—'}")
    return ids[speaker]


def synth_sentence(voice, text: str, length_scale: float, speaker: int | None = None,
                   noise: float | None = None, noise_w: float | None = None):
    """noise = Tonhöhen-/Klangvariation, noise_w = Rhythmusvariation (höher = lebendiger)."""
    from piper import SynthesisConfig

    cfg = SynthesisConfig(length_scale=length_scale, normalize_audio=True, volume=0.95, speaker_id=speaker,
                          noise_scale=noise, noise_w_scale=noise_w)
    audio_parts = []
    alignments = []
    ok = True
    for chunk in voice.synthesize(text, syn_config=cfg, include_alignments=True):
        audio_parts.append(chunk.audio_float_array)
        if chunk.phoneme_alignments:
            # Satzgrenzen innerhalb eines Chunks: Wortgrenze erzwingen
            if alignments:
                alignments.append(type(chunk.phoneme_alignments[0])(phoneme=" ", phoneme_ids=[], num_samples=0))
            alignments.extend(chunk.phoneme_alignments)
        else:
            ok = False
    audio = np.concatenate(audio_parts) if audio_parts else np.zeros(1, dtype=np.float32)
    return audio, (alignments if ok else None), voice.config.sample_rate


def build(script: dict, voice, length_scale: float, fallback: bool):
    vcfg = script.get("voice") or {}
    spk = speaker_id(voice, vcfg.get("speaker"))
    noise, noise_w = vcfg.get("noiseScale"), vcfg.get("noiseW")
    pron = script.get("pronunciations", {}) or {}
    sr = voice.config.sample_rate if voice else 22050
    pieces: list[np.ndarray] = []
    words: list[dict] = []
    scenes: list[dict] = []
    stats = {"aligned": 0, "estimated": 0}
    t = 0.0

    def silence(sec: float):
        nonlocal t
        pieces.append(np.zeros(int(sec * sr), dtype=np.float32))
        t += int(sec * sr) / sr

    silence(LEAD_IN)
    for si, scene in enumerate(script["scenes"]):
        tokens = display_tokens(scene["narration"])
        sents = split_sentences(tokens)
        n_start = t
        for k, sent in enumerate(sents):
            spoken = [spoken_form(tok, pron) for tok in sent]
            spoken_counts = [max(1, len([w for w in s.split() if not PUNCT_ONLY.match(w)])) for s in spoken]
            text = " ".join(spoken)
            if voice is not None:
                # "pace" pro Szene: <1 schneller, >1 langsamer (z. B. dramatische Enthüllung)
                audio, align, sr = synth_sentence(voice, text, length_scale * float(scene.get("pace", 1.0)),
                                                  spk, noise, noise_w)
            else:  # Platzhalter: Stille mit geschätzter Dauer (nur lokale Tests)
                dur = sum(len(s) for s in spoken) / 14.0 + 0.2
                audio, align = np.zeros(int(dur * sr), dtype=np.float32), None
            spans = word_spans_from_alignment(align) if align else []
            if spans and len(spans) == sum(spoken_counts):
                tok_spans = []
                idx = 0
                for c in spoken_counts:
                    tok_spans.append((spans[idx][0], spans[idx + c - 1][1]))
                    idx += c
                stats["aligned"] += len(sent)
            else:
                b0, b1 = speech_bounds(audio, sr) if voice is not None else (0, len(audio))
                tok_spans = proportional_spans([len(s) + 2 for s in spoken], b0, b1)
                stats["estimated"] += len(sent)
            for tok, (a, b) in zip(sent, tok_spans):
                words.append({
                    "text": caption_text(tok),
                    "start": round(t + a / sr, 3),
                    "end": round(t + b / sr, 3),
                    "scene": si,
                })
            pieces.append(audio.astype(np.float32))
            t += len(audio) / sr
            if k < len(sents) - 1:
                last = sent[-1]
                # "…" = dramatische Pause, Frage = kurze Spannungspause
                silence(0.65 if last.endswith(("…", "...")) else 0.35 if last.endswith("?") else SENTENCE_GAP)
        n_end = t
        scenes.append({"narrationStart": round(n_start, 3), "narrationEnd": round(n_end, 3)})
        if si < len(script["scenes"]) - 1:
            silence(SCENE_GAP)
    silence(TAIL)
    duration = t
    for i, s in enumerate(scenes):
        s["start"] = 0.0 if i == 0 else round((scenes[i - 1]["narrationEnd"] + s["narrationStart"]) / 2, 3)
    for i, s in enumerate(scenes):
        s["end"] = round(duration, 3) if i == len(scenes) - 1 else scenes[i + 1]["start"]
    audio = np.concatenate(pieces)
    return audio, sr, {"duration": round(duration, 3), "scenes": scenes, "words": words}, stats


def write_wav(path: Path, audio: np.ndarray, sr: int):
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--script", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--voice-dir", default=".voices")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--placeholder", action="store_true", help="Stille statt Stimme (nur zum lokalen Testen)")
    args = ap.parse_args()

    script = json.loads(Path(args.script).read_text(encoding="utf-8"))
    vcfg = script.get("voice", {}) or {}
    model = vcfg.get("model", "de_DE-thorsten-high")
    length_scale = float(vcfg.get("lengthScale", 1.0))
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)

    voice = None if args.placeholder else load_voice(model, Path(args.voice_dir))
    audio, sr, tl, stats = build(script, voice, length_scale, args.placeholder)

    # Dauer automatisch in den Zielbereich 35–60 s bringen (Sprechtempo ±15 %)
    adjusted = False
    if voice is not None and (tl["duration"] > MAX_DUR or tl["duration"] < MIN_DUR):
        target = MAX_DUR - 1.5 if tl["duration"] > MAX_DUR else MIN_DUR + 1.0
        speech = tl["duration"] - LEAD_IN - TAIL
        factor = (target - (tl["duration"] - speech)) / speech
        new_scale = max(0.85, min(1.15, length_scale * factor))
        if abs(new_scale - length_scale) > 0.01:
            print(f"[tts] Dauer {tl['duration']:.1f}s außerhalb 35–60s → lengthScale {length_scale:.2f} → {new_scale:.2f}", flush=True)
            length_scale = new_scale
            audio, sr, tl, stats = build(script, voice, length_scale, False)
            adjusted = True

    write_wav(out / "narration.wav", audio, sr)
    tl["fps"] = args.fps
    tl["meta"] = {
        "voice": "PLATZHALTER (Stille)" if voice is None else model,
        "lengthScale": round(length_scale, 3),
        "autoAdjusted": adjusted,
        "wordsAligned": stats["aligned"],
        "wordsEstimated": stats["estimated"],
        "sampleRate": sr,
    }
    (out / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"[tts] {tl['duration']:.2f}s, {len(tl['words'])} Wörter "
          f"(exakt: {stats['aligned']}, geschätzt: {stats['estimated']})", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
