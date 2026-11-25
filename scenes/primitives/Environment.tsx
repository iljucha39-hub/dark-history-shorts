import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Canvas, Layer} from '../../src/components/Camera';
import {noise1, ridgePath} from '../../src/lib/anim';
import type {Palette} from '../../src/theme';

let idCounter = 0;
const useId = (prefix: string) => {
	const ref = React.useRef<string | null>(null);
	if (ref.current === null) {
		idCounter += 1;
		ref.current = `${prefix}${idCounter}`;
	}
	return ref.current;
};

/** Himmel mit Verlauf, Sternen, Mond/Sonne und ziehenden Wolken */
export const Sky: React.FC<{
	p: Palette;
	moon?: boolean;
	moonX?: number;
	moonY?: number;
	stars?: boolean;
	clouds?: number;
}> = ({p, moon = true, moonX = 760, moonY = 420, stars = true, clouds = 4}) => {
	const frame = useCurrentFrame();
	const gid = useId('sky');
	return (
		<>
			<Layer depth={0}>
				<Canvas>
					<defs>
						<linearGradient id={`${gid}g`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0" stopColor={p.skyTop} />
							<stop offset="0.55" stopColor={p.skyMid} />
							<stop offset="1" stopColor={p.skyBottom} />
						</linearGradient>
						<radialGradient id={`${gid}m`}>
							<stop offset="0" stopColor={p.glow} stopOpacity="0.55" />
							<stop offset="0.25" stopColor={p.glow} stopOpacity="0.18" />
							<stop offset="1" stopColor={p.glow} stopOpacity="0" />
						</radialGradient>
					</defs>
					<rect x={-600} y={-600} width={2280} height={3200} fill={`url(#${gid}g)`} />
					{stars &&
						new Array(70).fill(0).map((_, i) => {
							const tw = 0.4 + 0.6 * Math.abs(Math.sin(frame / (12 + random(`tw${i}`) * 30) + i));
							return (
								<circle
									key={i}
									cx={-200 + random(`stx${i}`) * 1480}
									cy={-200 + random(`sty${i}`) * 1100}
									r={0.8 + random(`str${i}`) * 2.2}
									fill="#fff"
									opacity={0.15 + 0.6 * tw * random(`sto${i}`)}
								/>
							);
						})}
					{moon && p.sun && (
						<g>
							<circle cx={moonX} cy={moonY + 260} r={700} fill={`url(#${gid}m)`} />
							<circle cx={moonX} cy={moonY + 260} r={190} fill={p.glow} opacity={0.97} />
						</g>
					)}
					{moon && !p.sun && (
						<g>
							<circle cx={moonX} cy={moonY} r={520} fill={`url(#${gid}m)`} />
							<circle cx={moonX} cy={moonY} r={120} fill={p.glow} opacity={0.95} />
							<circle cx={moonX - 30} cy={moonY - 25} r={22} fill="#000" opacity={0.08} />
							<circle cx={moonX + 40} cy={moonY + 30} r={30} fill="#000" opacity={0.07} />
							<circle cx={moonX + 10} cy={moonY - 60} r={12} fill="#000" opacity={0.08} />
						</g>
					)}
				</Canvas>
			</Layer>
			<Layer depth={0.08}>
				<Canvas>
					{new Array(clouds).fill(0).map((_, i) => {
						const speed = 0.4 + random(`cs${i}`) * 0.8;
						const x = ((random(`cx${i}`) * 1800 + frame * speed) % 2000) - 500;
						const y = 150 + random(`cy${i}`) * 650;
						const w = 380 + random(`cw${i}`) * 420;
						return (
							<g key={i} opacity={0.35 + random(`co${i}`) * 0.35}>
								<ellipse cx={x} cy={y} rx={w / 2} ry={w / 9} fill={p.skyTop} />
								<ellipse cx={x + w * 0.18} cy={y - w / 14} rx={w / 3.2} ry={w / 10} fill={p.skyTop} />
								<ellipse cx={x - w * 0.05} cy={y + 6} rx={w / 2.4} ry={w / 16} fill={p.rim} opacity={0.08} />
							</g>
						);
					})}
				</Canvas>
			</Layer>
		</>
	);
};

/** Hügel-/Bergkette als Parallax-Ebene */
export const Hills: React.FC<{
	seed: string;
	color: string;
	baseY: number;
	amp: number;
	depth: number;
	freq?: number;
	rim?: string;
}> = ({seed, color, baseY, amp, depth, freq = 1, rim}) => {
	const d = ridgePath(seed, baseY, amp, {freq});
	return (
		<Layer depth={depth}>
			<Canvas>
				{rim && <path d={d} fill="none" stroke={rim} strokeOpacity={0.25} strokeWidth={3} />}
				<path d={d} fill={color} />
			</Canvas>
		</Layer>
	);
};

/** Treibende Nebelbänke */
export const Fog: React.FC<{p: Palette; y?: number; opacity?: number; depth?: number; count?: number}> = ({
	p,
	y = 1350,
	opacity = 0.35,
	depth = 0.6,
	count = 6,
}) => {
	const frame = useCurrentFrame();
	const gid = useId('fog');
	return (
		<Layer depth={depth}>
			<Canvas>
				<defs>
					<radialGradient id={gid}>
						<stop offset="0" stopColor={p.fog} stopOpacity="1" />
						<stop offset="1" stopColor={p.fog} stopOpacity="0" />
					</radialGradient>
				</defs>
				{new Array(count).fill(0).map((_, i) => {
					const dir = i % 2 === 0 ? 1 : -1;
					const x = ((random(`fx${i}`) * 1600 + frame * dir * (0.6 + random(`fs${i}`))) % 1900) - 400;
					return (
						<ellipse
							key={i}
							cx={x < -400 ? x + 1900 : x}
							cy={y + (random(`fy${i}`) - 0.5) * 260}
							rx={420 + random(`fw${i}`) * 300}
							ry={90 + random(`fh${i}`) * 70}
							fill={`url(#${gid})`}
							opacity={opacity}
						/>
					);
				})}
			</Canvas>
		</Layer>
	);
};

/** Flackernde Flamme (Fackel, Lagerfeuer, brennendes Dach) */
export const Flame: React.FC<{x: number; y: number; size?: number; seed?: string; p: Palette}> = ({
	x,
	y,
	size = 60,
	seed = 'f',
	p,
}) => {
	const frame = useCurrentFrame();
	const t = frame / 3;
	const fl = (k: number) => 1 + 0.18 * noise1(`${seed}${k}`, t + k);
	const w = size * 0.5;
	const h = size * fl(1);
	const sway = noise1(`${seed}s`, t / 2) * size * 0.18;
	const outer = `M ${x - w} ${y} Q ${x - w * 0.9} ${y - h * 0.5} ${x + sway} ${y - h * 1.3} Q ${x + w * 0.9} ${y - h * 0.5} ${x + w} ${y} Z`;
	const h2 = h * 0.7 * fl(2);
	const inner = `M ${x - w * 0.55} ${y} Q ${x - w * 0.5} ${y - h2 * 0.5} ${x + sway * 0.7} ${y - h2 * 1.2} Q ${x + w * 0.5} ${y - h2 * 0.5} ${x + w * 0.55} ${y} Z`;
	return (
		<g>
			<circle cx={x} cy={y - h * 0.4} r={size * 2.4 * fl(3)} fill={p.glow} opacity={0.12} />
			<path d={outer} fill="#ff6a1a" opacity={0.9} />
			<path d={inner} fill="#ffd060" />
		</g>
	);
};

/** Partikel: Glut, Staub, Asche, Schnee */
export const Particles: React.FC<{
	kind: 'embers' | 'dust' | 'ash';
	count?: number;
	color?: string;
	depth?: number;
}> = ({kind, count = 40, color, depth = 0.9}) => {
	const frame = useCurrentFrame();
	const c = color ?? (kind === 'embers' ? '#ffb050' : kind === 'ash' ? '#bbb' : '#e8dcc0');
	return (
		<Layer depth={depth}>
			<Canvas>
				{new Array(count).fill(0).map((_, i) => {
					const sp = 0.6 + random(`ps${kind}${i}`) * 1.8;
					const life = 2200;
					const up = kind === 'embers' ? -1 : kind === 'ash' ? 0.6 : -0.15;
					const baseX = random(`px${kind}${i}`) * 1300 - 110;
					const baseY = random(`py${kind}${i}`) * 2100;
					let yy = (baseY + frame * sp * up * 2.2) % life;
					if (yy < 0) yy += life;
					const xx = baseX + Math.sin(frame / (20 + i) + i) * 30 * sp;
					const r = kind === 'dust' ? 1.5 + random(`pr${i}`) * 2.5 : 2 + random(`pr${i}`) * 3.5;
					const flick = kind === 'embers' ? 0.5 + 0.5 * Math.sin(frame / 4 + i * 3) : 1;
					return (
						<circle
							key={i}
							cx={xx}
							cy={yy - 100}
							r={r}
							fill={c}
							opacity={(kind === 'dust' ? 0.35 : 0.8) * flick}
						/>
					);
				})}
			</Canvas>
		</Layer>
	);
};

export const Rain: React.FC<{intensity?: number}> = ({intensity = 1}) => {
	const frame = useCurrentFrame();
	const n = Math.round(120 * intensity);
	return (
		<Layer depth={1}>
			<Canvas>
				{new Array(n).fill(0).map((_, i) => {
					const sp = 38 + random(`rs${i}`) * 20;
					const x = random(`rx${i}`) * 1500 - 200;
					const y = ((random(`ry${i}`) * 2200 + frame * sp) % 2200) - 150;
					return (
						<line
							key={i}
							x1={x}
							y1={y}
							x2={x - 14}
							y2={y + 60}
							stroke="#a8c0d0"
							strokeOpacity={0.35}
							strokeWidth={2}
						/>
					);
				})}
			</Canvas>
		</Layer>
	);
};

/** Blitz: Aufhellung + gezackte Linie zu festen Zeitpunkten */
export const Lightning: React.FC<{every?: number; seed?: string}> = ({every = 70, seed = 'l'}) => {
	const frame = useCurrentFrame();
	const k = Math.floor(frame / every);
	const local = frame - k * every - 12;
	if (local < 0 || local > 10) return null;
	const flash = interpolate(local, [0, 1, 3, 4, 10], [0, 1, 0.3, 0.8, 0]);
	let x = 200 + random(`${seed}lx${k}`) * 680;
	let y = -50;
	let d = `M ${x} ${y}`;
	for (let i = 0; i < 12; i++) {
		x += (random(`${seed}l${k}${i}`) - 0.5) * 120;
		y += 70 + random(`${seed}ly${k}${i}`) * 40;
		d += ` L ${x} ${y}`;
	}
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{background: '#dfefff', opacity: flash * 0.35}} />
			<Canvas>
				<path d={d} stroke="#fff" strokeWidth={6} fill="none" opacity={flash} />
				<path d={d} stroke="#9fd0ff" strokeWidth={18} fill="none" opacity={flash * 0.3} />
			</Canvas>
		</AbsoluteFill>
	);
};

/** Fledermäuse / Krähen, die durchs Bild fliegen */
export const Flyers: React.FC<{count?: number; color?: string; y?: number}> = ({count = 6, color = '#05060a', y = 600}) => {
	const frame = useCurrentFrame();
	return (
		<Layer depth={0.35}>
			<Canvas>
				{new Array(count).fill(0).map((_, i) => {
					const sp = 3 + random(`bs${i}`) * 3;
					const x = ((random(`bx${i}`) * 1400 + frame * sp) % 1600) - 260;
					const yy = y + (random(`by${i}`) - 0.5) * 500 + Math.sin(frame / 8 + i) * 20;
					const flap = Math.sin(frame / 2.2 + i * 2) * 14;
					const s = 0.7 + random(`bsz${i}`) * 0.8;
					return (
						<path
							key={i}
							transform={`translate(${x} ${yy}) scale(${s})`}
							d={`M -26 ${-flap} Q -12 ${-4 - flap * 0.3} 0 4 Q 12 ${-4 - flap * 0.3} 26 ${-flap} Q 12 2 0 10 Q -12 2 -26 ${-flap} Z`}
							fill={color}
						/>
					);
				})}
			</Canvas>
		</Layer>
	);
};

/** Rauchsäule (Schornstein, brennende Stadt) */
export const Smoke: React.FC<{x: number; y: number; color?: string; scale?: number; seed?: string}> = ({
	x,
	y,
	color = '#3a3a3a',
	scale = 1,
	seed = 'sm',
}) => {
	const frame = useCurrentFrame();
	return (
		<g>
			{new Array(10).fill(0).map((_, i) => {
				const cycle = 90;
				const t = ((frame + i * (cycle / 10)) % cycle) / cycle;
				const r = (18 + t * 70) * scale;
				return (
					<circle
						key={i}
						cx={x + noise1(`${seed}${i}`, t * 3) * 40 * scale + t * 60 * scale}
						cy={y - t * 420 * scale}
						r={r}
						fill={color}
						opacity={0.45 * (1 - t)}
					/>
				);
			})}
		</g>
	);
};

/** Dunkle Bildränder für den filmischen Look */
export const Vignette: React.FC<{strength?: number}> = ({strength = 0.55}) => (
	<AbsoluteFill
		style={{
			background: `radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 100%)`,
		}}
	/>
);
