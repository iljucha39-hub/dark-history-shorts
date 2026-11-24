import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import type {Palette} from '../../src/theme';

const flicker = (frame: number, i: number) =>
	0.65 + 0.35 * Math.abs(Math.sin(frame / (5 + (i % 4)) + i * 1.7) * Math.cos(frame / 13 + i));

const Window: React.FC<{x: number; y: number; w?: number; h?: number; p: Palette; i: number; lit?: boolean}> = ({
	x,
	y,
	w = 14,
	h = 26,
	p,
	i,
	lit = true,
}) => {
	const frame = useCurrentFrame();
	const f = lit ? flicker(frame, i) : 0;
	return (
		<g>
			{lit && <circle cx={x + w / 2} cy={y + h / 2} r={w * 2.2} fill="#ffb050" opacity={0.12 * f} />}
			<path
				d={`M ${x} ${y + h} L ${x} ${y + w / 2} Q ${x + w / 2} ${y - 2} ${x + w} ${y + w / 2} L ${x + w} ${y + h} Z`}
				fill={lit ? '#ffb050' : '#000'}
				opacity={lit ? 0.55 + 0.45 * f : 0.6}
			/>
		</g>
	);
};

const crenels = (x: number, y: number, w: number, n: number) => {
	let d = '';
	const cw = w / (n * 2 - 1);
	for (let i = 0; i < n; i++) d += `M ${x + i * 2 * cw} ${y} h ${cw} v -${cw * 1.1} h -${cw} Z `;
	return d;
};

/** Burg mit Türmen, Zinnen und flackernden Fenstern. Ursprung = Mitte unten. */
export const Castle: React.FC<{x: number; y: number; scale?: number; p: Palette; color?: string}> = ({
	x,
	y,
	scale = 1,
	p,
	color,
}) => {
	const c = color ?? p.mid;
	const towers = [
		{dx: -250, w: 90, h: 420, roof: true},
		{dx: -120, w: 70, h: 330, roof: false},
		{dx: 0, w: 120, h: 560, roof: true},
		{dx: 130, w: 75, h: 360, roof: false},
		{dx: 250, w: 95, h: 450, roof: true},
	];
	return (
		<g transform={`translate(${x} ${y}) scale(${scale})`}>
			<rect x={-300} y={-260} width={600} height={260} fill={c} />
			<path d={crenels(-300, -260, 600, 15)} fill={c} />
			{towers.map((t, i) => (
				<g key={i}>
					<rect x={t.dx - t.w / 2} y={-t.h} width={t.w} height={t.h} fill={c} />
					{t.roof ? (
						<path d={`M ${t.dx - t.w / 2 - 10} ${-t.h} L ${t.dx} ${-t.h - t.w * 1.3} L ${t.dx + t.w / 2 + 10} ${-t.h} Z`} fill={c} />
					) : (
						<path d={crenels(t.dx - t.w / 2, -t.h, t.w, 3)} fill={c} />
					)}
					{t.roof && <line x1={t.dx} y1={-t.h - t.w * 1.3} x2={t.dx} y2={-t.h - t.w * 1.3 - 40} stroke={c} strokeWidth={3} />}
					{t.roof && (
						<path d={`M ${t.dx} ${-t.h - t.w * 1.3 - 40} l 26 7 l -26 7 Z`} fill={p.accent} opacity={0.8} />
					)}
					<Window x={t.dx - 7} y={-t.h + 60} p={p} i={i} lit={random(`cw${i}`) > 0.25} />
					{t.h > 400 && <Window x={t.dx - 7} y={-t.h + 160} p={p} i={i + 10} lit={random(`cw2${i}`) > 0.4} />}
				</g>
			))}
			<path d="M -40 0 L -40 -90 Q 0 -140 40 -90 L 40 0 Z" fill="#000" opacity={0.7} />
			<Window x={-190} y={-200} p={p} i={20} />
			<Window x={170} y={-180} p={p} i={21} lit={false} />
		</g>
	);
};

/** Fachwerkhaus. Ursprung = Mitte unten. */
export const House: React.FC<{
	x: number;
	y: number;
	w?: number;
	h?: number;
	p: Palette;
	seed: number;
	color?: string;
	chimney?: boolean;
}> = ({x, y, w = 200, h = 240, p, seed, color, chimney = true}) => {
	const c = color ?? p.mid;
	const roofH = w * 0.75;
	const beams = '#000';
	return (
		<g transform={`translate(${x} ${y})`}>
			{chimney && <rect x={w * 0.18} y={-h - roofH * 0.8} width={w * 0.12} height={roofH * 0.6} fill={c} />}
			<rect x={-w / 2} y={-h} width={w} height={h} fill={c} />
			<path d={`M ${-w / 2 - 18} ${-h} L 0 ${-h - roofH} L ${w / 2 + 18} ${-h} Z`} fill={c} />
			<path d={`M ${-w / 2 - 18} ${-h} L 0 ${-h - roofH} L ${w / 2 + 18} ${-h}`} stroke={p.rim} strokeOpacity={0.18} strokeWidth={3} fill="none" />
			<g stroke={beams} strokeOpacity={0.45} strokeWidth={6}>
				<line x1={-w / 2} y1={-h / 2} x2={w / 2} y2={-h / 2} />
				<line x1={-w / 4} y1={-h} x2={-w / 4} y2={0} />
				<line x1={w / 4} y1={-h} x2={w / 4} y2={0} />
				<line x1={-w / 2} y1={-h} x2={-w / 4} y2={-h / 2} />
				<line x1={w / 2} y1={-h} x2={w / 4} y2={-h / 2} />
			</g>
			<rect x={-18} y={-70} width={36} height={70} fill="#000" opacity={0.75} />
			<Window x={-w / 2 + 22} y={-h + 30} w={26} h={34} p={p} i={seed} lit={random(`hw${seed}`) > 0.3} />
			<Window x={w / 2 - 48} y={-h + 30} w={26} h={34} p={p} i={seed + 3} lit={random(`hw2${seed}`) > 0.5} />
		</g>
	);
};

/** Kahler Baum (rekursiv verzweigt, wiegt sich im Wind). */
export const DeadTree: React.FC<{x: number; y: number; scale?: number; color: string; seed?: string}> = ({
	x,
	y,
	scale = 1,
	color,
	seed = 't',
}) => {
	const frame = useCurrentFrame();
	const sway = Math.sin(frame / 25) * 1.5;
	const branches: React.ReactNode[] = [];
	const grow = (bx: number, by: number, ang: number, len: number, w: number, depth: number, key: string) => {
		const a = ((ang + sway * (4 - depth)) * Math.PI) / 180;
		const ex = bx + Math.sin(a) * len;
		const ey = by - Math.cos(a) * len;
		branches.push(<line key={key} x1={bx} y1={by} x2={ex} y2={ey} stroke={color} strokeWidth={w} strokeLinecap="round" />);
		if (depth >= 4) return;
		const n = 2 + (random(`${seed}${key}`) > 0.6 ? 1 : 0);
		for (let i = 0; i < n; i++) {
			const da = (random(`${seed}${key}a${i}`) - 0.5) * 70 + (i - (n - 1) / 2) * 30;
			grow(ex, ey, ang + da, len * (0.62 + random(`${seed}${key}l${i}`) * 0.15), w * 0.62, depth + 1, `${key}${i}`);
		}
	};
	grow(0, 0, 0, 170, 22, 0, 'r');
	return <g transform={`translate(${x} ${y}) scale(${scale})`}>{branches}</g>;
};

/** Galgen */
export const Gallows: React.FC<{x: number; y: number; color: string; scale?: number}> = ({x, y, color, scale = 1}) => {
	const frame = useCurrentFrame();
	const swing = Math.sin(frame / 20) * 4;
	return (
		<g transform={`translate(${x} ${y}) scale(${scale})`}>
			<rect x={-10} y={-420} width={20} height={420} fill={color} />
			<rect x={-10} y={-420} width={200} height={18} fill={color} />
			<line x1={-10} y1={-330} x2={80} y2={-412} stroke={color} strokeWidth={14} />
			<g transform={`rotate(${swing} 170 -402)`}>
				<line x1={170} y1={-402} x2={170} y2={-300} stroke="#5a4a30" strokeWidth={4} />
				<circle cx={170} cy={-290} r={14} fill="none" stroke="#5a4a30" strokeWidth={4} />
			</g>
		</g>
	);
};

/** Segelschiff, Ursprung = Wasserlinie Mitte */
export const Ship: React.FC<{p: Palette; scale?: number}> = ({p, scale = 1}) => {
	const frame = useCurrentFrame();
	const billow = Math.sin(frame / 10) * 8;
	const hull = p.near;
	return (
		<g transform={`scale(${scale})`}>
			<path d="M -260 -40 L 260 -60 L 210 40 L -200 40 Z" fill={hull} />
			<path d="M -260 -40 L 260 -60" stroke={p.rim} strokeOpacity={0.4} strokeWidth={4} />
			<rect x={-12} y={-520} width={14} height={470} fill={hull} />
			<rect x={-150} y={-400} width={10} height={350} fill={hull} />
			<rect x={120} y={-380} width={10} height={320} fill={hull} />
			<path d={`M -5 -500 Q ${110 + billow} -380 -5 -250 Z`} fill="#c8b890" opacity={0.85} />
			<path d={`M -5 -240 Q ${130 + billow} -150 -5 -70 Z`} fill="#c8b890" opacity={0.85} />
			<path d={`M -145 -380 Q ${-60 + billow} -290 -145 -190 Z`} fill="#b8a880" opacity={0.8} />
			<path d={`M 125 -360 Q ${200 + billow} -270 125 -170 Z`} fill="#b8a880" opacity={0.8} />
			<path d="M -5 -520 L 40 -510 L -5 -498 Z" fill={p.accent} />
			{[-180, -90, 0, 90, 180].map((xx, i) => (
				<circle key={i} cx={xx} cy={-10} r={7} fill="#ffb050" opacity={0.5 + 0.4 * Math.sin(frame / 6 + i)} />
			))}
		</g>
	);
};
