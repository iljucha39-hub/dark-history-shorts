#!/usr/bin/env node
/**
 * Bestimmt, welche Skripte gerendert werden (für GitHub Actions).
 *   Push:     alle in diesem Push neu/geänderten scripts/*.json mit "status": "approved"
 *   Manuell:  SCRIPTS="a,b" (IDs oder Pfade) oder SCRIPTS="all" (alle freigegebenen)
 *   Commit-Nachricht mit [render:<id>] oder [render:all] erzwingt ein Rendering
 *   (z. B. nach Änderungen an Szenen/Pipeline).
 * Ausgabe: matrix=["scripts/a.json", ...] in $GITHUB_OUTPUT
 */
import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const sh = (c) => {
	try {
		return execSync(c, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
	} catch {
		return '';
	}
};
const isScript = (f) => /^scripts\/[^/_][^/]*\.json$/.test(f) && fs.existsSync(f);
const approved = (f) => {
	try {
		return JSON.parse(fs.readFileSync(f, 'utf8')).status === 'approved';
	} catch {
		return true; // ungültiges JSON trotzdem aufnehmen → Validierung meldet den Fehler
	}
};

let files = [];
const forced = [...(process.env.COMMIT_MSG ?? '').matchAll(/\[render:([a-z0-9,-]+)\]/g)].map((m) => m[1]).join(',');
const input = (process.env.SCRIPTS ?? '').trim() || forced;
if (input) {
	files =
		input === 'all'
			? fs.readdirSync('scripts').map((f) => `scripts/${f}`).filter(isScript)
			: input.split(/[\s,]+/).filter(Boolean).map((s) => (s.endsWith('.json') ? s : `scripts/${s}.json`));
	const missing = files.filter((f) => !fs.existsSync(f));
	if (missing.length) {
		console.error(`Nicht gefunden: ${missing.join(', ')}`);
		process.exit(1);
	}
} else {
	const before = process.env.BEFORE ?? '';
	const sha = process.env.SHA ?? 'HEAD';
	let diff = '';
	if (before && !/^0+$/.test(before)) diff = sh(`git diff --name-only --diff-filter=AM ${before} ${sha}`);
	if (!diff) {
		// neuer Branch: gegen den Standard-Branch vergleichen, sonst letzter Commit
		const base = sh(`git merge-base origin/${process.env.DEFAULT_BRANCH ?? 'main'} ${sha}`);
		diff = base ? sh(`git diff --name-only --diff-filter=AM ${base} ${sha}`) : sh(`git diff --name-only --diff-filter=AM ${sha}~1 ${sha}`);
	}
	files = diff.split('\n').filter(isScript);
}
const selected = [...new Set(files)].filter((f) => input || approved(f)).map((f) => f.split(path.sep).join('/'));
const skipped = files.filter((f) => !selected.includes(f));
console.log(`Ausgewählt (${selected.length}): ${selected.join(', ') || '—'}`);
if (skipped.length) console.log(`Übersprungen (Status "draft"): ${skipped.join(', ')}`);
if (process.env.GITHUB_OUTPUT) {
	fs.appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${JSON.stringify(selected)}\ncount=${selected.length}\n`);
}
