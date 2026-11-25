import React, {useMemo} from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT_CAPTION} from '../theme';
import type {ScriptScene, WordTiming} from '../types';

interface Chunk {
	words: WordTiming[];
	start: number;
	end: number;
}

const norm = (w: string) =>
	w
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]/gu, '');

/** Wörter zu kurzen, gut lesbaren Untertitel-Blöcken (max. 3 Wörter) gruppieren */
export const chunkWords = (words: WordTiming[]): Chunk[] => {
	const chunks: Chunk[] = [];
	let cur: WordTiming[] = [];
	const flush = () => {
		if (cur.length) chunks.push({words: cur, start: cur[0].start, end: cur[cur.length - 1].end});
		cur = [];
	};
	words.forEach((w, i) => {
		const prev = cur[cur.length - 1];
		if (prev && prev.scene !== w.scene) flush();
		cur.push(w);
		const chars = cur.reduce((a, x) => a + x.text.length, 0);
		const punct = /[.,;:!?…–—]$/.test(w.text);
		const next = words[i + 1];
		const pause = next ? next.start - w.end > 0.25 : true;
		if (cur.length >= 3 || chars >= 16 || punct || pause) flush();
	});
	flush();
	// Lücken schließen, damit der Untertitel nicht flackert
	for (let i = 0; i < chunks.length - 1; i++) {
		const gap = chunks[i + 1].start - chunks[i].end;
		if (gap < 0.4) chunks[i].end = chunks[i + 1].start;
		else chunks[i].end += 0.2;
	}
	return chunks;
};

export const Captions: React.FC<{words: WordTiming[]; scenes: ScriptScene[]; hiddenScenes?: boolean[]}> = ({
	words,
	scenes,
	hiddenScenes = [],
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const chunks = useMemo(() => chunkWords(words), [words]);
	const emphasis = useMemo(
		() => scenes.map((s) => new Set((s.emphasis ?? []).map(norm))),
		[scenes],
	);
	const chunk = chunks.find((c) => t >= c.start - 0.05 && t < c.end);
	if (!chunk || hiddenScenes[chunk.words[0].scene]) return null;
	const pop = spring({frame: frame - Math.round(chunk.start * fps), fps, config: {damping: 14, stiffness: 260, mass: 0.6}});
	// Lange Wörter (z. B. „fünfundzwanzigsten“) verkleinern, damit nichts über den Rand ragt
	const longest = Math.max(...chunk.words.map((w) => w.text.length));
	const fontSize = Math.min(88, Math.floor(860 / (longest * 0.74)));
	return (
		<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 1010}}>
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					justifyContent: 'center',
					gap: '0 30px',
					maxWidth: 900,
					transform: `scale(${0.75 + 0.25 * pop}) translateY(${(1 - pop) * 30}px)`,
					opacity: Math.min(1, pop * 1.5),
				}}
			>
				{chunk.words.map((w, i) => {
					const active = t >= w.start - 0.03 && t < w.end + 0.05;
					const spoken = t >= w.start - 0.03;
					const emph = emphasis[w.scene]?.has(norm(w.text));
					const color = emph ? '#ff2a3a' : active ? '#ffd27a' : spoken ? '#ffffff' : '#d8d0c0';
					return (
						<span
							key={i}
							style={{
								fontFamily: FONT_CAPTION,
								fontWeight: 900,
								fontSize,
								lineHeight: 1.12,
								textTransform: 'uppercase',
								color,
								WebkitTextStroke: '14px #000',
								paintOrder: 'stroke fill',
								textShadow: '0 10px 28px rgba(0,0,0,0.85)',
								display: 'inline-block',
								transform: `scale(${active ? 1.06 : 1}) rotate(${active ? -1.5 : 0}deg)`,
								transformOrigin: '50% 60%',
								margin: '0 6px',
							}}
						>
							{w.text}
						</span>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
