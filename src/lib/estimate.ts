import type {Timeline, VideoScript, WordTiming} from '../types';

/**
 * Geschätzte Zeitleiste (ca. 2,6 Wörter/s) – nur für die Vorschau im
 * Remotion Studio. Beim echten Rendern kommt die Zeitleiste aus der TTS-Stufe.
 */
export const estimateTimeline = (script: VideoScript, fps = 30): Timeline => {
	const wps = 2.6;
	const gap = 0.35;
	let t = 0.15;
	const words: WordTiming[] = [];
	const scenes = script.scenes.map((s, si) => {
		const ws = s.narration.split(/\s+/).filter(Boolean);
		const narrationStart = t;
		ws.forEach((w) => {
			const d = Math.max(0.18, (w.length / 6) / wps);
			words.push({text: w, start: t, end: t + d, scene: si});
			t += d + 0.04;
		});
		const narrationEnd = t;
		t += gap;
		return {start: 0, end: 0, narrationStart, narrationEnd};
	});
	scenes.forEach((s, i) => {
		s.start = i === 0 ? 0 : (scenes[i - 1].narrationEnd + s.narrationStart) / 2;
	});
	const duration = t + 0.8;
	scenes.forEach((s, i) => {
		s.end = i === scenes.length - 1 ? duration : (s.narrationEnd + scenes[i + 1].narrationStart) / 2;
	});
	return {fps, duration, scenes, words};
};
