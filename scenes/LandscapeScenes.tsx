import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Canvas, Layer} from '../src/components/Camera';
import {Cast} from './characters/Cast';
import {Figure, RimLight} from './characters/Figure';
import {Castle, DeadTree, House, Ship} from './primitives/Buildings';
import {Flame, Flyers, Fog, Hills, Lightning, Particles, Rain, Sky, Smoke} from './primitives/Environment';
import type {SceneProps} from './types';

const GROUND = 1560;

export const CastleScene: React.FC<SceneProps> = ({visual, durationInFrames, p, index}) => (
	<AbsoluteFill>
		<Sky p={p} moonX={780} moonY={460} />
		<Hills seed={`c1${index}`} color={p.far} baseY={1200} amp={260} depth={0.15} />
		<Layer depth={0.3}>
			<Canvas>
				<path d="M -300 1500 Q 300 1080 540 1110 Q 800 1130 1400 1500 L 1400 2400 L -300 2400 Z" fill={p.mid} />
				<Castle x={560} y={1140} scale={0.95} p={p} />
			</Canvas>
		</Layer>
		<Flyers count={7} y={620} />
		<Fog p={p} y={1330} opacity={0.3} depth={0.45} />
		<Hills seed={`c2${index}`} color={p.near} baseY={1640} amp={90} depth={0.8} rim={p.rim} />
		<Layer depth={0.9}>
			<Canvas>
				<DeadTree x={110} y={1660} scale={1.6} color={p.near} />
			</Canvas>
		</Layer>
		{visual.characters?.length ? (
			<Cast id={`castle${index}`} characters={visual.characters} groundY={GROUND + 60} p={p} durationInFrames={durationInFrames} />
		) : null}
		{visual.fire && <Particles kind="embers" count={40} />}
		{visual.rain && <Rain />}
		{visual.lightning && <Lightning seed={`c${index}`} />}
		<Fog p={p} y={1750} opacity={0.25} depth={1} count={4} />
	</AbsoluteFill>
);

export const VillageScene: React.FC<SceneProps> = ({visual, durationInFrames, p, index}) => {
	const houses = [
		{x: -60, w: 230, h: 260},
		{x: 200, w: 200, h: 320},
		{x: 440, w: 240, h: 240},
		{x: 690, w: 210, h: 300},
		{x: 930, w: 230, h: 270},
		{x: 1170, w: 200, h: 310},
	];
	const chars = visual.characters ?? [
		{kind: 'plagueDoctor' as const, action: 'walk' as const, x: 0.2},
		{kind: 'peasant' as const, action: 'idle' as const, x: 0.78, facing: 'left' as const},
	];
	return (
		<AbsoluteFill>
			<Sky p={p} moon={!visual.fire} moonX={300} moonY={380} />
			<Hills seed={`v1${index}`} color={p.far} baseY={1180} amp={200} depth={0.12} />
			{visual.fire && (
				<Layer depth={0.2}>
					<Canvas>
						<Smoke x={300} y={1150} color="#1a0a06" scale={2} seed="vs1" />
						<Smoke x={800} y={1150} color="#1a0a06" scale={2.4} seed="vs2" />
					</Canvas>
				</Layer>
			)}
			<Layer depth={0.5}>
				<Canvas>
					{houses.map((h, i) => (
						<g key={i}>
							<House x={h.x} y={1430} w={h.w} h={h.h} p={p} seed={i + index * 10} />
							{!visual.fire && <Smoke x={h.x + h.w * 0.24} y={1430 - h.h - h.w * 0.8} color={p.fog} scale={0.5} seed={`hs${i}`} />}
							{visual.fire && i % 2 === 0 && (
								<>
									<Flame x={h.x - 20} y={1430 - h.h - 40} size={90} seed={`vf${i}`} p={p} />
									<Flame x={h.x + 40} y={1430 - h.h - 10} size={70} seed={`vg${i}`} p={p} />
								</>
							)}
						</g>
					))}
					<rect x={-400} y={1430} width={1900} height={900} fill={p.mid} />
					<path d="M -400 1500 Q 540 1470 1500 1510" stroke={p.rim} strokeOpacity={0.12} strokeWidth={60} fill="none" />
				</Canvas>
			</Layer>
			<Fog p={p} y={1420} opacity={0.35} depth={0.55} />
			<Cast id={`village${index}`} characters={chars} groundY={GROUND + 40} p={p} durationInFrames={durationInFrames} />
			{visual.fire && <Particles kind="embers" count={60} />}
			{!visual.fire && <Particles kind="dust" count={30} />}
			{visual.rain && <Rain />}
			{visual.lightning && <Lightning seed={`v${index}`} />}
		</AbsoluteFill>
	);
};

/** Zwei Heere, Pfeilhagel, Banner, Staub – mit Kamerawackeln */
export const BattleScene: React.FC<SceneProps> = ({visual, durationInFrames, p, index}) => {
	const frame = useCurrentFrame();
	const leftKind = visual.characters?.[0]?.kind ?? 'knight';
	const rightKind = visual.characters?.[1]?.kind ?? 'soldier';
	const prog = frame / Math.max(1, durationInFrames);
	const rows = [
		{y: 1380, s: 0.9, n: 9, depth: 0.45},
		{y: 1500, s: 1.25, n: 7, depth: 0.65},
	];
	return (
		<AbsoluteFill>
			<Sky p={p} moon={false} stars={false} clouds={6} />
			<Hills seed={`b1${index}`} color={p.far} baseY={1220} amp={180} depth={0.12} />
			<Layer depth={0.18}>
				<Canvas>
					<Smoke x={180} y={1200} color="#140806" scale={2.2} seed="bs1" />
					<Smoke x={860} y={1180} color="#140806" scale={2.8} seed="bs2" />
				</Canvas>
			</Layer>
			<Hills seed={`b2${index}`} color={p.mid} baseY={1360} amp={60} depth={0.35} />
			{rows.map((r, ri) => (
				<Layer key={ri} depth={r.depth}>
					<Canvas>
						<RimLight id={`brim${index}${ri}`} color={p.rim}>
							{new Array(r.n).fill(0).map((_, i) => {
								const side = i < r.n / 2 ? -1 : 1;
								const k = side < 0 ? i : i - Math.ceil(r.n / 2);
								const startX = side < 0 ? -60 + k * 95 : 1140 - k * 95;
								const adv = interpolate(prog, [0, 1], [0, 170 + random(`ad${ri}${i}`) * 60]);
								const x = startX - side * adv;
								const fighting = Math.abs(x - 540) < 150;
								return (
									<Figure
										key={i}
										kind={side < 0 ? leftKind : rightKind}
										action={fighting ? 'fight' : 'run'}
										x={x}
										y={r.y + random(`by${ri}${i}`) * 30}
										scale={r.s}
										facing={side < 0 ? 'right' : 'left'}
										p={p}
										seed={i * 2.3 + ri}
									/>
								);
							})}
						</RimLight>
						{/* Banner */}
						{[-1, 1].map((side) => {
							const bx = side < 0 ? 120 + prog * 150 : 960 - prog * 150;
							const wave = (o: number) => Math.sin(frame / 5 + o) * 10;
							return (
								<g key={side}>
									<rect x={bx} y={r.y - 330 * r.s} width={6} height={330 * r.s} fill={p.near} />
									<path
										d={`M ${bx + 6} ${r.y - 330 * r.s} q 40 ${wave(0)} 80 0 q 20 ${wave(1)} 30 10 l -30 40 q -40 ${wave(2)} -80 0 Z`}
										transform={side > 0 ? `translate(${2 * bx + 6} 0) scale(-1 1)` : undefined}
										fill={side < 0 ? p.accent : '#d8c890'}
									/>
								</g>
							);
						})}
					</Canvas>
				</Layer>
			))}
			{/* Pfeilhagel */}
			<Layer depth={0.5}>
				<Canvas>
					{new Array(18).fill(0).map((_, i) => {
						const cyc = 40;
						const t = ((frame + random(`ar${i}`) * cyc) % cyc) / cyc;
						const fromLeft = i % 2 === 0;
						const x0 = fromLeft ? -100 : 1180;
						const x1 = fromLeft ? 700 + random(`ax${i}`) * 300 : 100 + random(`ax${i}`) * 300;
						const x = x0 + (x1 - x0) * t;
						const y = 1300 - Math.sin(t * Math.PI) * (700 + random(`ah${i}`) * 300);
						const ang = (Math.atan2(-Math.cos(t * Math.PI) * 900 * Math.PI, x1 - x0) * 180) / Math.PI;
						return (
							<g key={i} transform={`translate(${x} ${y}) rotate(${ang})`}>
								<line x1={-30} y1={0} x2={20} y2={0} stroke="#1a120a" strokeWidth={3} />
								<path d="M 20 -4 L 30 0 L 20 4 Z" fill="#555" />
							</g>
						);
					})}
				</Canvas>
			</Layer>
			<Particles kind="dust" count={50} color="#a08060" />
			{visual.fire !== false && <Particles kind="embers" count={35} />}
			<Fog p={p} y={1700} opacity={0.4} depth={1} count={5} />
		</AbsoluteFill>
	);
};

export const DungeonScene: React.FC<SceneProps> = ({visual, durationInFrames, p, index}) => {
	const frame = useCurrentFrame();
	const bricks: React.ReactNode[] = [];
	for (let r = 0; r < 26; r++) {
		for (let c = -1; c < 9; c++) {
			const w = 150;
			const h = 78;
			const x = c * w + (r % 2 ? w / 2 : 0) - 60;
			const y = r * h - 200;
			const shade = 0.5 + random(`br${r}${c}`) * 0.5;
			bricks.push(
				<rect key={`${r}-${c}`} x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={6} fill={p.far} opacity={shade} />,
			);
		}
	}
	const chainSwing = (o: number) => Math.sin(frame / 22 + o) * 6;
	const chars = visual.characters ?? [{kind: 'peasant' as const, action: 'cower' as const, x: 0.45}];
	return (
		<AbsoluteFill style={{background: p.near}}>
			<Layer depth={0.2}>
				<Canvas>
					<rect x={-400} y={-400} width={1900} height={2800} fill={p.near} />
					{bricks}
					{/* vergittertes Fenster mit Mondlicht */}
					<rect x={620} y={360} width={240} height={300} fill={p.skyBottom} opacity={0.6} />
					{[0, 1, 2, 3].map((i) => (
						<rect key={i} x={640 + i * 60} y={360} width={12} height={300} fill={p.near} />
					))}
					<path d="M 620 660 L 860 660 L 600 1800 L -100 1800 Z" fill={p.glow} opacity={0.07} />
				</Canvas>
			</Layer>
			<Layer depth={0.4}>
				<Canvas>
					<rect x={130} y={820} width={22} height={60} fill="#2a1c10" />
					<Flame x={141} y={820} size={70} seed="dt" p={p} />
					{[300, 860].map((cx, i) => (
						<g key={i} transform={`rotate(${chainSwing(i)} ${cx} 600)`}>
							{new Array(9).fill(0).map((_, k) => (
								<ellipse key={k} cx={cx} cy={600 + k * 34} rx={9} ry={18} fill="none" stroke="#4a4a4a" strokeWidth={6} />
							))}
							<path d={`M ${cx - 24} 910 a 24 24 0 1 0 48 0`} fill="none" stroke="#4a4a4a" strokeWidth={8} />
						</g>
					))}
					<rect x={-400} y={1560} width={1900} height={800} fill={p.mid} />
				</Canvas>
			</Layer>
			<Cast id={`dungeon${index}`} characters={chars} groundY={1640} p={p} durationInFrames={durationInFrames} />
			<Particles kind="dust" count={40} />
			{visual.fire && <Particles kind="embers" count={30} />}
		</AbsoluteFill>
	);
};

export const SeaScene: React.FC<SceneProps> = ({visual, p, index}) => {
	const frame = useCurrentFrame();
	const wave = (base: number, amp: number, speed: number, k: number, seed: number) => {
		let d = `M -400 2400 L -400 ${base}`;
		for (let x = -400; x <= 1500; x += 30) {
			const y = base + Math.sin(x / k + frame * speed + seed) * amp + Math.sin(x / (k * 0.37) - frame * speed * 1.7 + seed) * amp * 0.35;
			d += ` L ${x} ${y.toFixed(1)}`;
		}
		return d + ' L 1500 2400 Z';
	};
	const rock = Math.sin(frame / 18) * 5;
	const bob = Math.sin(frame / 14) * 18;
	return (
		<AbsoluteFill>
			<Sky p={p} moon={!visual.lightning} moonX={260} moonY={360} stars={false} clouds={7} />
			<Layer depth={0.2}>
				<Canvas>
					<path d={wave(1180, 20, 0.05, 140, 1)} fill={p.far} />
				</Canvas>
			</Layer>
			<Layer depth={0.45}>
				<Canvas>
					<path d={wave(1300, 34, 0.07, 120, 2)} fill={p.mid} />
					<g transform={`translate(560 ${1320 + bob}) rotate(${rock})`}>
						<Ship p={p} scale={1.1} />
					</g>
				</Canvas>
			</Layer>
			<Layer depth={0.75}>
				<Canvas>
					<path d={wave(1400, 60, 0.09, 110, 3)} fill={p.near} />
					<path d={wave(1400, 60, 0.09, 110, 3)} fill="none" stroke={p.rim} strokeOpacity={0.25} strokeWidth={4} />
				</Canvas>
			</Layer>
			<Layer depth={1}>
				<Canvas>
					<path d={wave(1620, 80, 0.11, 160, 4)} fill="#010304" />
				</Canvas>
			</Layer>
			{visual.rain !== false && <Rain intensity={1.2} />}
			{visual.lightning !== false && <Lightning every={80} seed={`s${index}`} />}
		</AbsoluteFill>
	);
};
