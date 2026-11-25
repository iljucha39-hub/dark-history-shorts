#!/usr/bin/env node
// Prüft Videoskripte (scripts/*.json) auf Vollständigkeit und Regeln.
// Aufruf: node pipeline/validate.mjs scripts/a.json [scripts/b.json ...]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const SCENE_TYPES = ['title', 'castle', 'village', 'battle', 'map', 'portrait', 'document', 'dungeon', 'sea', 'closeup'];
export const CAMERAS = ['pushIn', 'pullOut', 'panLeft', 'panRight', 'tiltUp', 'tiltDown', 'drift', 'punchIn'];
export const MOODS = ['night', 'blood', 'fog', 'fire', 'storm', 'gold', 'sunset', 'dusk'];
export const KINDS = ['knight', 'soldier', 'archer', 'king', 'queen', 'monk', 'peasant', 'plagueDoctor', 'executioner', 'noble', 'viking'];
export const ACTIONS = ['idle', 'walk', 'run', 'march', 'fight', 'point', 'cower', 'raiseArm', 'pray'];

const WORDS_PER_SECOND = 2.5; // grobe Schätzung für Piper/Thorsten bei lengthScale 1.0

export const estimateSeconds = (script) => {
	const words = script.scenes.reduce((a, s) => a + s.narration.split(/\s+/).filter(Boolean).length, 0);
	return {words, seconds: words / WORDS_PER_SECOND / (script.voice?.speed ?? 1) + script.scenes.length * (script.voice?.pauses === 'tight' ? 0.08 : 0.25) + 0.5};
};

/** @returns {{errors: string[], warnings: string[]}} */
export const validateScript = (script, file) => {
	const errors = [];
	const warnings = [];
	const err = (m) => errors.push(m);
	const warn = (m) => warnings.push(m);

	if (!script || typeof script !== 'object') return {errors: ['Datei ist kein JSON-Objekt'], warnings};
	if (!/^[a-z0-9][a-z0-9-]*$/.test(script.id ?? '')) err('"id" fehlt oder enthält ungültige Zeichen (erlaubt: a-z, 0-9, -)');
	if (file) {
		const stem = path.basename(file, '.json');
		if (script.id && stem !== script.id) err(`"id" (${script.id}) muss dem Dateinamen entsprechen (${stem})`);
	}
	if (!script.title) err('"title" fehlt');
	if (!['draft', 'approved'].includes(script.status)) err('"status" muss "draft" oder "approved" sein');
	if (!Array.isArray(script.scenes)) {
		err('"scenes" fehlt');
		return {errors, warnings};
	}
	if (script.scenes.length < 6 || script.scenes.length > 10) err(`6–10 Szenen erforderlich, gefunden: ${script.scenes.length}`);
	script.scenes.forEach((s, i) => {
		const at = `Szene ${i + 1}`;
		if (!s.narration || !s.narration.trim()) err(`${at}: "narration" fehlt`);
		const v = s.visual;
		if (!v) return err(`${at}: "visual" fehlt`);
		if (!SCENE_TYPES.includes(v.type)) err(`${at}: unbekannter Szenentyp "${v.type}" (erlaubt: ${SCENE_TYPES.join(', ')})`);
		if (v.camera && !CAMERAS.includes(v.camera)) err(`${at}: unbekannte Kamera "${v.camera}"`);
		if (v.mood && !MOODS.includes(v.mood)) err(`${at}: unbekannte Stimmung "${v.mood}"`);
		(v.characters ?? []).forEach((c, k) => {
			if (!KINDS.includes(c.kind)) err(`${at}, Figur ${k + 1}: unbekannte Figur "${c.kind}"`);
			if (c.action && !ACTIONS.includes(c.action)) err(`${at}, Figur ${k + 1}: unbekannte Aktion "${c.action}"`);
		});
		if (v.type === 'map') {
			const b = v.map?.bounds;
			if (!Array.isArray(b) || b.length !== 4 || b[0] >= b[2] || b[1] >= b[3]) err(`${at}: map.bounds muss [West, Süd, Ost, Nord] sein`);
			(v.map?.markers ?? []).forEach((m, k) => {
				if (typeof m.lon !== 'number' || typeof m.lat !== 'number') err(`${at}: Marker ${k + 1} braucht lon/lat`);
			});
		}
		if (['title', 'document'].includes(v.type) && !v.text) warn(`${at}: Szenentyp "${v.type}" wirkt am besten mit "text"`);
	});
	if (script.scenes[0] && script.scenes[0].narration.split(/\s+/).length > 22) {
		warn('Hook (Szene 1) ist lang – die ersten 2 Sekunden müssen packen');
	}
	if (!script.sources?.length) warn('Keine Quellen angegeben ("sources")');
	const est = estimateSeconds(script);
	if (est.seconds < 26 || est.seconds > 47) {
		warn(`Geschätzte Dauer ${est.seconds.toFixed(0)} s (${est.words} Wörter) liegt außerhalb 30–40 s (Ziel) – Sprechtempo wird automatisch angepasst (max. ±15 %)`);
	}
	const last = script.scenes[script.scenes.length - 1];
	if (last && /folge|abonnier|like/i.test(last.narration)) {
		warn('Letzte Szene ist ein Aufruf („Folge …“) – besser: Schluss-Satz, der in den Hook zurückführt (Loop)');
	}
	return {errors, warnings};
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
	const files = process.argv.slice(2);
	if (!files.length) {
		console.error('Aufruf: node pipeline/validate.mjs scripts/<datei>.json ...');
		process.exit(2);
	}
	let failed = false;
	for (const f of files) {
		let script;
		try {
			script = JSON.parse(fs.readFileSync(f, 'utf8'));
		} catch (e) {
			console.error(`✗ ${f}: ungültiges JSON – ${e.message}`);
			failed = true;
			continue;
		}
		const {errors, warnings} = validateScript(script, f);
		const est = estimateSeconds(script);
		if (errors.length) failed = true;
		console.log(`${errors.length ? '✗' : '✓'} ${f}  (${script.scenes?.length ?? 0} Szenen, ~${est.seconds.toFixed(0)} s, Status: ${script.status})`);
		errors.forEach((e) => console.log(`   FEHLER:  ${e}`));
		warnings.forEach((w) => console.log(`   HINWEIS: ${w}`));
	}
	process.exit(failed ? 1 : 0);
}
