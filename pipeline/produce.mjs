#!/usr/bin/env node
/**
 * Produziert ein oder mehrere Videos nacheinander:
 *   Skript prüfen → Sprachausgabe (Piper) → Musik → Mix (FFmpeg)
 *   → Rendern (Remotion) → Nachbearbeitung (FFmpeg) → Cover → Bericht
 *
 * Aufruf:
 *   node pipeline/produce.mjs scripts/<id>.json [weitere.json ...]
 * Optionen (Umgebungsvariablen):
 *   PLACEHOLDER_TTS=1     Stille statt Stimme (nur lokale Tests ohne Stimmenmodell)
 *   REMOTION_BROWSER=...  Pfad zu Chrome/Chromium (sonst lädt Remotion selbst einen)
 *   FRAMES=0-89           nur einen Ausschnitt rendern (Test)
 *   CONCURRENCY=4         parallele Browser-Tabs beim Rendern
 */
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {estimateSeconds, validateScript} from './validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FPS = 30;
const PY = process.env.PYTHON ?? 'python3';

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const run = (cmd, args, opts = {}) => {
	const r = spawnSync(cmd, args, {stdio: 'inherit', cwd: ROOT, ...opts});
	if (r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 3).join(' ')} … fehlgeschlagen (Exit ${r.status})`);
};
const rel = (p) => path.relative(ROOT, p);

const srtTime = (s) => {
	const ms = Math.max(0, Math.round(s * 1000));
	const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
	const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
	const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
	return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, '0')}`;
};

const writeSrt = (words, file) => {
	const lines = [];
	let cur = [];
	const flush = () => {
		if (!cur.length) return;
		lines.push({start: cur[0].start, end: cur[cur.length - 1].end, text: cur.map((w) => w.text).join(' ')});
		cur = [];
	};
	words.forEach((w, i) => {
		if (cur.length && cur[0].scene !== w.scene) flush();
		cur.push(w);
		if (cur.length >= 6 || /[.!?]$/.test(w.text) || i === words.length - 1) flush();
	});
	fs.writeFileSync(
		file,
		lines.map((l, i) => `${i + 1}\n${srtTime(l.start)} --> ${srtTime(l.end)}\n${l.text}\n`).join('\n'),
	);
};

const probe = (file) => {
	const out = execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString();
	const j = JSON.parse(out);
	const v = j.streams.find((s) => s.codec_type === 'video');
	const a = j.streams.find((s) => s.codec_type === 'audio');
	const [num, den] = (v?.r_frame_rate ?? '0/1').split('/').map(Number);
	return {
		width: v?.width,
		height: v?.height,
		fps: den ? num / den : 0,
		duration: Number(j.format.duration),
		videoCodec: v?.codec_name,
		audioCodec: a?.codec_name ?? null,
		sizeMB: Number(j.format.size) / 1024 / 1024,
	};
};

const loudness = (file) => {
	const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], {
		encoding: 'utf8',
	});
	const m = /I:\s+(-?[\d.]+) LUFS/.exec(r.stderr ?? '');
	return m ? Number(m[1]) : null;
};

async function produce(scriptFile, serveUrl) {
	const t0 = Date.now();
	const timings = {};
	const step = async (name, fn) => {
		const s = Date.now();
		log(`▶ ${name}`);
		const r = await fn();
		timings[name] = (Date.now() - s) / 1000;
		return r;
	};

	const script = JSON.parse(fs.readFileSync(scriptFile, 'utf8'));
	const {errors, warnings} = validateScript(script, scriptFile);
	if (errors.length) throw new Error(`Skript ungültig:\n - ${errors.join('\n - ')}`);
	const id = script.id;
	const audioDir = path.join(ROOT, 'audio', id);
	const genDir = path.join(ROOT, 'assets', 'generated', id);
	const outDir = path.join(ROOT, 'output', id);
	[audioDir, genDir, outDir].forEach((d) => fs.mkdirSync(d, {recursive: true}));

	// 1) Sprachausgabe
	await step('Sprachausgabe (Piper TTS)', () =>
		run(PY, [
			'pipeline/tts.py',
			'--script',
			scriptFile,
			'--out-dir',
			audioDir,
			'--voice-dir',
			path.join(ROOT, '.voices'),
			'--fps',
			String(FPS),
			...(process.env.PLACEHOLDER_TTS === '1' ? ['--placeholder'] : []),
		]),
	);
	const timeline = JSON.parse(fs.readFileSync(path.join(audioDir, 'timeline.json'), 'utf8'));

	// 2) Musik
	const musicFile = path.join(audioDir, 'music.wav');
	await step('Musik', () => {
		const own = script.music?.file ? path.join(ROOT, script.music.file) : null;
		if (own && fs.existsSync(own)) {
			run('ffmpeg', ['-y', '-v', 'error', '-stream_loop', '-1', '-i', own, '-t', String(timeline.duration), '-af', `afade=t=out:st=${Math.max(0, timeline.duration - 2.5)}:d=2.5`, '-ar', '44100', '-ac', '2', musicFile]);
		} else {
			run(PY, ['pipeline/music.py', '--timeline', path.join(audioDir, 'timeline.json'), '--out', musicFile, '--seed', String(script.music?.seed ?? 1), '--key', script.music?.key ?? 'd']);
		}
	});

	// 3) Mix: Musik wird unter der Stimme abgesenkt (Sidechain), Lautheit -14 LUFS
	const mixFile = path.join(genDir, 'mix.wav');
	await step('Audio-Mix (FFmpeg)', () =>
		run('ffmpeg', [
			'-y', '-v', 'error',
			'-i', path.join(audioDir, 'narration.wav'),
			'-i', musicFile,
			'-filter_complex',
			[
				'[0:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,acompressor=threshold=0.125:ratio=3:attack=5:release=80,asplit=2[voice][sc]',
				'[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.55[mus]',
				'[mus][sc]sidechaincompress=threshold=0.04:ratio=6:attack=15:release=350[duck]',
				'[voice][duck]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[out]',
			].join(';'),
			'-map', '[out]', '-ar', '48000', '-ac', '2', mixFile,
		]),
	);

	// 4) Untertitel-Dateien
	fs.writeFileSync(path.join(ROOT, 'subtitles', `${id}.json`), JSON.stringify(timeline.words, null, 1));
	writeSrt(timeline.words, path.join(ROOT, 'subtitles', `${id}.srt`));

	// 5) Rendern – das Bundle wurde vorab gebaut, generierte Dateien hineinkopieren
	fs.cpSync(genDir, path.join(serveUrl, 'public', 'generated', id), {recursive: true});
	const inputProps = {script, timeline, audio: `generated/${id}/mix.wav`};
	const browserExecutable = process.env.REMOTION_BROWSER || null;
	const composition = await selectComposition({serveUrl, id: 'DarkHistoryShort', inputProps, browserExecutable});
	const rawFile = path.join(outDir, 'render-raw.mp4');
	const frameRange = process.env.FRAMES ? process.env.FRAMES.split('-').map(Number) : null;
	let lastPct = -1;
	await step('Rendern (Remotion)', () =>
		renderMedia({
			composition,
			serveUrl,
			codec: 'h264',
			crf: 16,
			outputLocation: rawFile,
			inputProps,
			browserExecutable,
			concurrency: Number(process.env.CONCURRENCY) || Math.max(1, Math.min(8, os.cpus().length)),
			frameRange: frameRange && frameRange.length === 2 ? [frameRange[0], frameRange[1]] : null,
			chromiumOptions: {gl: 'swangle'},
			onProgress: ({progress}) => {
				const pct = Math.floor(progress * 10) * 10;
				if (pct !== lastPct) {
					lastPct = pct;
					log(`   Render ${pct} %`);
				}
			},
		}),
	);

	// 6) Nachbearbeitung: Filmkorn, Web-Optimierung
	const finalFile = path.join(outDir, `${id}.mp4`);
	await step('Nachbearbeitung (FFmpeg)', () =>
		run('ffmpeg', [
			'-y', '-v', 'error', '-i', rawFile,
			'-vf', 'noise=c0s=4:c0f=t,format=yuv420p',
			'-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-maxrate', '8M', '-bufsize', '16M', '-profile:v', 'high', '-r', String(FPS),
			'-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', finalFile,
		]),
	);
	fs.rmSync(rawFile, {force: true});

	// 7) Cover-Bild
	const coverFile = path.join(outDir, 'cover.jpg');
	await step('Cover-Bild', () =>
		renderStill({
			composition,
			serveUrl,
			output: coverFile,
			inputProps,
			frame: Math.min(composition.durationInFrames - 1, Math.round(1.4 * FPS)),
			imageFormat: 'jpeg',
			jpegQuality: 90,
			browserExecutable,
			chromiumOptions: {gl: 'swangle'},
		}),
	);

	// 8) Prüfung + Bericht
	const info = probe(finalFile);
	const lufs = loudness(finalFile);
	const checks = [
		['Auflösung 1080×1920', info.width === 1080 && info.height === 1920, `${info.width}×${info.height}`],
		['30 FPS', Math.abs(info.fps - 30) < 0.01, `${info.fps.toFixed(2)}`],
		['Dauer 35–60 s', frameRange ? null : info.duration >= 35 && info.duration <= 60.5, `${info.duration.toFixed(2)} s`],
		['Tonspur vorhanden', Boolean(info.audioCodec), info.audioCodec ?? '—'],
		['Echte Stimme (kein Platzhalter)', !String(timeline.meta.voice).startsWith('PLATZHALTER'), timeline.meta.voice],
		['Szenenanzahl 6–10', script.scenes.length >= 6 && script.scenes.length <= 10, String(script.scenes.length)],
	];
	const total = (Date.now() - t0) / 1000;
	const ok = checks.every(([, pass]) => pass !== false);
	const rows = script.scenes
		.map((s, i) => {
			const st = timeline.scenes[i];
			return `| ${i + 1} | ${s.visual.type} | ${s.visual.mood ?? 'Standard'} | ${(st.end - st.start).toFixed(1)} s | ${s.narration.replace(/\|/g, '/')} |`;
		})
		.join('\n');
	const report = `# Produktionsbericht: ${script.title}

**Status:** ${ok ? '✅ erfolgreich' : '⚠️ mit Abweichungen'}
**Video-ID:** \`${id}\`
**Erstellt:** ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC
**Produktionszeit:** ${total.toFixed(0)} s

## Technische Prüfung

| Prüfung | Ergebnis | Wert |
|---|---|---|
${checks.map(([n, p, v]) => `| ${n} | ${p === null ? '– (Teilrender)' : p ? '✅' : '❌'} | ${v} |`).join('\n')}

- Dateigröße: ${info.sizeMB.toFixed(1)} MB, Video: ${info.videoCodec}, Audio: ${info.audioCodec}
- Lautheit: ${lufs !== null ? `${lufs.toFixed(1)} LUFS (Ziel −14)` : 'nicht messbar'}
- Stimme: ${timeline.meta.voice}, Sprechtempo (lengthScale): ${timeline.meta.lengthScale}${timeline.meta.autoAdjusted ? ' (automatisch angepasst)' : ''}
- Untertitel-Timing: ${timeline.meta.wordsAligned} Wörter exakt (Phonem-Alignment), ${timeline.meta.wordsEstimated} geschätzt
- Musik: ${script.music?.file ? `eigene Datei ${script.music.file}` : `synthetisch (Seed ${script.music?.seed ?? 1}, Tonart ${script.music?.key ?? 'd'})`}

## Szenen

| # | Typ | Stimmung | Dauer | Sprechertext |
|---|---|---|---|---|
${rows}

## Laufzeiten

${Object.entries(timings).map(([k, v]) => `- ${k}: ${v.toFixed(1)} s`).join('\n')}

## Hinweise

${warnings.length ? warnings.map((w) => `- ${w}`).join('\n') : '- keine'}

## Veröffentlichung (zum Kopieren)

**Titel:** ${script.title}

**Beschreibung:** ${script.description ?? ''}

**Hashtags:** ${(script.hashtags ?? []).map((h) => `#${h}`).join(' ')}

## Quellen

${(script.sources ?? []).map((s) => `- ${s}`).join('\n') || '- keine angegeben'}
`;
	fs.writeFileSync(path.join(outDir, 'bericht.md'), report);
	fs.writeFileSync(
		path.join(outDir, 'beschreibung.txt'),
		`${script.title}\n\n${script.description ?? ''}\n\n${(script.hashtags ?? []).map((h) => `#${h}`).join(' ')}\n`,
	);
	fs.copyFileSync(path.join(ROOT, 'subtitles', `${id}.srt`), path.join(outDir, `${id}.srt`));
	fs.writeFileSync(
		path.join(outDir, 'bericht.json'),
		JSON.stringify({id, title: script.title, ok, checks, info, lufs, timings, total, meta: timeline.meta, estimate: estimateSeconds(script)}, null, 1),
	);
	log(`${ok ? '✅' : '⚠️'} ${id}: ${rel(finalFile)} (${info.duration.toFixed(1)} s, ${info.sizeMB.toFixed(1)} MB) in ${total.toFixed(0)} s`);
	return {id, ok, report};
}

async function main() {
	const files = process.argv.slice(2);
	if (!files.length) {
		console.error('Aufruf: node pipeline/produce.mjs scripts/<id>.json [...]');
		process.exit(2);
	}
	log('▶ Bündeln (Remotion/Webpack)');
	const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src', 'index.ts'), publicDir: path.join(ROOT, 'assets')});
	const results = [];
	for (const f of files) {
		try {
			results.push(await produce(path.resolve(f), serveUrl));
		} catch (e) {
			console.error(`❌ ${f}: ${e.message}`);
			results.push({id: path.basename(f, '.json'), ok: false, error: e.message});
		}
	}
	const failed = results.filter((r) => r.error);
	log(`Fertig: ${results.length - failed.length}/${results.length} Videos produziert`);
	process.exit(failed.length ? 1 : 0);
}

main();
