"""
Chatterbox Multilingual (Resemble AI, MIT-Lizenz) als ausdrucksstarke Sprach-Engine
plus Wort-Zeitstempel über faster-whisper (MIT, Whisper-Gewichte MIT): das erzeugte
Audio wird erkannt und die erkannten Wörter den Skriptwörtern zugeordnet.

Chatterbox ist zufallsbasiert: jeder Satz wird mit festem Seed erzeugt (reproduzierbar)
und auf Plausibilität geprüft (abgeschnitten / Halluzination → neuer Versuch).
"""
from __future__ import annotations

import difflib
import re

import numpy as np


def norm(word: str) -> str:
    return re.sub(r"[^\wäöüß]", "", word.lower())


class ChatterboxEngine:
    name = "chatterbox"

    def __init__(self, exaggeration: float = 0.9, cfg_weight: float = 0.3, temperature: float = 0.8,
                 reference: str | None = None, seed: int = 1):
        import torch
        import torchaudio
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS

        self.torch = torch
        self.torchaudio = torchaudio
        self.model = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
        self.sr = self.model.sr
        self.exaggeration = exaggeration
        self.cfg_weight = cfg_weight
        self.temperature = temperature
        self.seed = seed
        if reference:
            self.model.prepare_conditionals(reference, exaggeration=exaggeration)
        from faster_whisper import WhisperModel

        self.asr = WhisperModel("base", device="cpu", compute_type="int8")
        self.calls = 0
        self.retries = 0

    # ------------------------------------------------------------ Synthese
    def _generate(self, text: str, seed: int) -> np.ndarray:
        self.torch.manual_seed(seed)
        wav = self.model.generate(text, language_id="de", exaggeration=self.exaggeration,
                                  cfg_weight=self.cfg_weight, temperature=self.temperature)
        return wav.squeeze(0).cpu().numpy().astype(np.float32)

    @staticmethod
    def _trim(audio: np.ndarray, sr: int) -> np.ndarray:
        idx = np.where(np.abs(audio) > 0.015)[0]
        if len(idx) == 0:
            return audio
        a = max(0, idx[0] - int(0.03 * sr))
        b = min(len(audio), idx[-1] + int(0.08 * sr))
        return audio[a:b]

    def synth(self, text: str, words: list[str], pace: float = 1.0):
        """→ (audio, Wort-Spannen in Samples oder None, Abtastrate)"""
        self.calls += 1
        chars = len(text)
        expected = chars / 13.5  # grobe Sprechdauer in s
        best = None
        for attempt in range(4):
            audio = self._trim(self._generate(text, self.seed * 1000 + self.calls * 10 + attempt), self.sr)
            dur = len(audio) / self.sr
            spans = self.align(audio, words)
            ok_len = 0.55 * expected <= dur <= 2.2 * expected + 0.8
            # Ende abgeschnitten? Dann endet das letzte Wort direkt am Audioende
            cut = spans is not None and (len(audio) - spans[-1][1]) < 0.02 * self.sr and dur < expected
            score = (ok_len, spans is not None, not cut)
            if best is None or score > best[0]:
                best = (score, audio, spans)
            if all(score):
                break
            self.retries += 1
            print(f"[chatterbox] Satz neu erzeugt (Dauer {dur:.1f}s, erwartet ~{expected:.1f}s): {text[:50]}…", flush=True)
        _, audio, spans = best
        if abs(pace - 1.0) > 0.01:
            audio, spans = self.stretch(audio, spans, pace)
        return audio, spans, self.sr

    def stretch(self, audio: np.ndarray, spans, factor: float):
        """Zeitdehnung ohne Tonhöhenänderung (factor > 1 = langsamer)."""
        import librosa

        out = librosa.effects.time_stretch(audio, rate=1.0 / factor).astype(np.float32)
        if spans:
            ratio = len(out) / max(1, len(audio))
            spans = [(int(a * ratio), int(b * ratio)) for a, b in spans]
        return out, spans

    # ------------------------------------------------------------ Alignment
    def align(self, audio: np.ndarray, words: list[str]):
        """Wort-Spannen (Samples) für die erwarteten Wörter; None wenn zu unsicher."""
        if not words:
            return None
        try:
            wav = self.torch.from_numpy(audio).unsqueeze(0)
            wav16 = self.torchaudio.functional.resample(wav, self.sr, 16000).squeeze(0).numpy()
            segments, _ = self.asr.transcribe(wav16, language="de", word_timestamps=True, beam_size=5,
                                              initial_prompt=" ".join(words), vad_filter=False)
            rec = [w for seg in segments for w in (seg.words or [])]
        except Exception as e:  # noqa: BLE001
            print(f"[chatterbox] Erkennung fehlgeschlagen: {e}", flush=True)
            return None
        if not rec:
            return None
        exp_n = [norm(w) for w in words]
        rec_n = [norm(w.word) for w in rec]
        times: list[tuple[float, float] | None] = [None] * len(words)
        sm = difflib.SequenceMatcher(a=exp_n, b=rec_n, autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == "equal":
                for k in range(i2 - i1):
                    r = rec[j1 + k]
                    times[i1 + k] = (r.start, r.end)
            elif tag == "replace":
                # z. B. Zahlen/Komposita: Bereich gleichmäßig auf die erwarteten Wörter verteilen
                t0, t1 = rec[j1].start, rec[j2 - 1].end
                n = i2 - i1
                for k in range(n):
                    times[i1 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
        matched = sum(1 for t in times if t is not None)
        if matched < 0.6 * len(words):
            print(f"[chatterbox] Zuordnung unsicher ({matched}/{len(words)} Wörter)", flush=True)
            return None
        # Lücken (fehlende Wörter) zwischen Nachbarn interpolieren
        total = len(audio) / self.sr
        for i in range(len(times)):
            if times[i] is None:
                prev_end = next((times[j][1] for j in range(i - 1, -1, -1) if times[j]), 0.0)
                nxt = next((j for j in range(i + 1, len(times)) if times[j]), None)
                next_start = times[nxt][0] if nxt is not None else total
                gap_words = (nxt if nxt is not None else len(times)) - i
                step = max(0.05, (next_start - prev_end) / max(1, gap_words))
                times[i] = (prev_end, min(total, prev_end + step))
        return [(int(a * self.sr), int(max(a + 0.05, b) * self.sr)) for a, b in times]
