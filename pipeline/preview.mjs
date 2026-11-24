#!/usr/bin/env node
/**
 * Schnelle Szenen-Vorschau (Kontaktabzug) ohne komplettes Rendern:
 * rendert pro Szene 2 Standbilder und setzt sie zu einem Bild zusammen.
 *   node pipeline/preview.mjs scripts/<id>.json  →  output/<id>/vorschau.jpg
 * Nutzt audio/<id>/timeline.json, falls vorhanden, sonst eine Schätzung.
 */
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FPS = 30;

const estimate = (script) => {
	// gleiche Logik wie src/lib/estimate.ts
	let t = 0.15;
	const words = [];
	const scenes = script.scenes.map((s, si) => {
		const narrationStart = t;
		s.narration.split(/\s+/).filter(Boolean).forEach((w) => {
			const d = Math.max(0.18, w.length / 6 / 2.6);
			words.push({text: w, start: t, end: t + d, scene: si});
			t += d + 0.04;
		});
		const narrationEnd = t;
		t += 0.35;
		return {start: 0, end: 0, narrationStart, narrationEnd};
	});
	const duration = t + 0.8;
	scenes.forEach((s, i) => {
		s.start = i === 0 ? 0 : (scenes[i - 1].narrationEnd + s.narrationStart) / 2;
	});
	scenes.forEach((s, i) => {
		s.end = i === scenes.length - 1 ? duration : (s.narrationEnd + scenes[i + 1].narrationStart) / 2;
	});
	return {fps: FPS, duration, scenes, words};
};

const file = process.argv[2];
if (!file) {
	console.error('Aufruf: node pipeline/preview.mjs scripts/<id>.json');
	process.exit(2);
}
const script = JSON.parse(fs.readFileSync(file, 'utf8'));
const tlFile = path.join(ROOT, 'audio', script.id, 'timeline.json');
const timeline = fs.existsSync(tlFile) ? JSON.parse(fs.readFileSync(tlFile, 'utf8')) : estimate(script);
const outDir = path.join(ROOT, 'output', script.id, 'vorschau');
fs.mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src', 'index.ts'), publicDir: path.join(ROOT, 'assets')});
const inputProps = {script, timeline, audio: null};
const browserExecutable = process.env.REMOTION_BROWSER || null;
const composition = await selectComposition({serveUrl, id: 'DarkHistoryShort', inputProps, browserExecutable});
const frames = [];
timeline.scenes.forEach((s, i) => {
	for (const f of [0.3, 0.8]) frames.push({scene: i, frame: Math.round((s.start + (s.end - s.start) * f) * FPS)});
});
const paths = [];
for (const [k, fr] of frames.entries()) {
	const out = path.join(outDir, `s${String(fr.scene + 1).padStart(2, '0')}-${k % 2 ? 'b' : 'a'}.jpg`);
	await renderStill({
		composition,
		serveUrl,
		output: out,
		inputProps,
		frame: Math.min(fr.frame, composition.durationInFrames - 1),
		imageFormat: 'jpeg',
		scale: 0.3,
		browserExecutable,
		chromiumOptions: {gl: 'swangle'},
	});
	paths.push(out);
	console.log(`Szene ${fr.scene + 1}, Frame ${fr.frame} → ${path.relative(ROOT, out)}`);
}
const cols = 4;
const rows = Math.ceil(paths.length / cols);
const sheet = path.join(ROOT, 'output', script.id, 'vorschau.jpg');
const r = spawnSync(
	'ffmpeg',
	['-y', '-v', 'error', ...paths.flatMap((p) => ['-i', p]), '-filter_complex', `${paths.map((_, i) => `[${i}:v]`).join('')}xstack=inputs=${paths.length}:layout=${paths.map((_, i) => `${(i % cols) * 324}_${Math.floor(i / cols) * 576}`).join('|')}:fill=black`, sheet],
	{stdio: 'inherit'},
);
if (r.status === 0) console.log(`Kontaktabzug: ${path.relative(ROOT, sheet)} (${cols}×${rows})`);
