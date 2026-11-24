#!/usr/bin/env python3
"""
Erzeugt eine düstere, lizenzfreie Hintergrund-Tonspur rein synthetisch (numpy):
  * tiefer Drone-Akkord (Moll), langsam atmend, Akkordwechsel
  * Wind/Rauschen
  * Impact-"Boom" am Videoanfang und bei jedem Szenenwechsel
  * Herzschlag-Puls in der zweiten Hälfte, Ausblendung am Ende

Kein Download, keine Lizenzfragen. Eigene Musik kann alternativ über
"music": {"file": "audio/music/<datei>.mp3"} im Skript verwendet werden.
"""
from __future__ import annotations

import argparse
import json
import wave
from pathlib import Path

import numpy as np

SR = 44100

KEYS = {  # Grundton (Hz) der Tonart
    "c": 65.41, "d": 73.42, "e": 82.41, "f": 87.31, "g": 98.0, "a": 55.0, "b": 61.74,
}


def drone(t: np.ndarray, root: float, dur: float, rng: np.random.Generator) -> np.ndarray:
    # Akkordfolge i – VI – iv – v (Moll) in halben Tönen relativ zum Grundton
    prog = [(0, 3, 7), (-4, 0, 3), (5, 8, 12), (7, 10, 14)]
    seg = 8.0
    out = np.zeros_like(t)
    for k in range(int(dur // seg) + 2):
        chord = prog[k % len(prog)]
        env = np.clip(1 - np.abs((t - k * seg - seg / 2) / (seg * 0.75)), 0, 1) ** 1.5
        if not env.any():
            continue
        for semi in chord:
            f = root * 2 ** (semi / 12)
            for det in (-0.6, 0.0, 0.7):
                ph = rng.uniform(0, 2 * np.pi)
                out += env * np.sin(2 * np.pi * (f + det) * t + ph) * 0.08
            out += env * np.sin(2 * np.pi * f * 2 * t) * 0.02  # Oktave, leise
    # Sub-Bass Grundton
    out += np.sin(2 * np.pi * root / 2 * t) * 0.12
    # langsames Atmen
    out *= 0.75 + 0.25 * np.sin(2 * np.pi * t / 9.0)
    return out


def wind(n: int, rng: np.random.Generator) -> np.ndarray:
    white = rng.standard_normal(n).astype(np.float64)
    brown = np.cumsum(white)
    brown -= np.convolve(brown, np.ones(4410) / 4410, mode="same")  # Drift entfernen
    brown /= np.max(np.abs(brown)) + 1e-9
    t = np.arange(n) / SR
    return brown * (0.5 + 0.5 * np.sin(2 * np.pi * t / 13.0 + 1.3)) * 0.12


def boom(length: float = 2.5, strength: float = 1.0, rng=None) -> np.ndarray:
    t = np.arange(int(length * SR)) / SR
    f = 30 + 90 * np.exp(-t * 6)  # Pitch-Sweep nach unten
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 2.2)
    click = (rng.standard_normal(len(t)) if rng is not None else np.zeros(len(t))) * np.exp(-t * 40) * 0.4
    return (body + click) * 0.9 * strength


def heartbeat(n: int, start: float, end: float) -> np.ndarray:
    out = np.zeros(n)
    beat = np.arange(int(0.18 * SR)) / SR
    thump = np.sin(2 * np.pi * 52 * beat) * np.exp(-beat * 25)
    t = start
    while t < end:
        for off, amp in ((0.0, 0.5), (0.28, 0.35)):
            i = int((t + off) * SR)
            if i + len(thump) < n:
                out[i:i + len(thump)] += thump * amp
        t += 0.95
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--timeline", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--key", default="d")
    args = ap.parse_args()

    tl = json.loads(Path(args.timeline).read_text(encoding="utf-8"))
    dur = float(tl["duration"])
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(args.seed)
    root = KEYS.get(args.key.lower(), 73.42)

    mix = drone(t, root, dur, rng) + wind(n, rng)
    # Impacts: großer Boom bei 0 s (Hook), kleinere bei Szenenwechseln
    hits = [(0.0, 1.2)] + [(s["start"], 0.55) for s in tl["scenes"][1:]]
    for start, strength in hits:
        b = boom(strength=strength, rng=rng)
        i = int(start * SR)
        j = min(n, i + len(b))
        mix[i:j] += b[: j - i]
    mix += heartbeat(n, dur * 0.45, dur - 4)

    # Ein-/Ausblenden
    fade_in = np.clip(t / 0.05, 0, 1)
    fade_out = np.clip((dur - t) / 2.5, 0, 1)
    mix *= fade_in * fade_out
    mix /= np.max(np.abs(mix)) + 1e-9
    mix *= 0.8

    # leichte Stereo-Breite durch Verzögerung
    d = int(0.012 * SR)
    left = mix
    right = np.concatenate([np.zeros(d), mix[:-d]])
    stereo = np.stack([left, right], axis=1)
    pcm = (stereo * 32767).astype(np.int16)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    with wave.open(args.out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"[music] {dur:.1f}s synthetisiert → {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
