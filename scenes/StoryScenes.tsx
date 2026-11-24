import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Canvas, Layer} from '../src/components/Camera';
import {FONT_TITLE} from '../src/theme';
import {Figure, RimLight} from './characters/Figure';
import {Flame, Lightning, Particles} from './primitives/Environment';
import type {SceneProps} from './types';

/** Lichtstrahlen von oben (Kirche, Thronsaal, Verhör) */
const GodRays: React.FC<{color: string}> = ({color}) => {
	const frame = useCurrentFrame();
	return (
		<Layer depth={0.15}>
			<Canvas>
				{new Array(6).fill(0).map((_, i) => {
					const x = 140 + i * 160 + Math.sin(frame / 60 + i) * 30;
					const op = 0.05 + 0.04 * Math.sin(frame / 25 + i * 2);
					return <path key={i} d={`M ${x} -200 L ${x + 60} -200 L ${x + 380} 2000 L ${x + 120} 2000 Z`} fill={color} opacity={op} />;
				})}
			</Canvas>
		</Layer>
	);
};

/** Großes Figurenporträt mit Namensschild */
export const PortraitScene: React.FC<SceneProps> = ({visual, p, index}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const ch = visual.characters?.[0] ?? {kind: 'king' as const, action: 'idle' as const};
	const plate = spring({frame: frame - 8, fps, config: {damping: 16}});
	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(ellipse 70% 50% at 50% 45%, ${p.skyBottom} 0%, ${p.skyMid} 45%, ${p.skyTop} 100%)`,
			}}
		>
			<GodRays color={p.glow} />
			<Layer depth={0.3}>
				<Canvas>
					{/* gotischer Bogen im Hintergrund */}
					<path d="M 160 1900 L 160 700 Q 540 160 920 700 L 920 1900" fill="none" stroke={p.far} strokeWidth={70} />
					<path d="M 160 1900 L 160 700 Q 540 160 920 700 L 920 1900" fill="none" stroke={p.rim} strokeOpacity={0.12} strokeWidth={4} />
				</Canvas>
			</Layer>
			<Layer depth={0.5}>
				<Canvas>
					{/* Gegenlicht hinter der Figur */}
					<defs>
						<radialGradient id={`back${index}`}>
							<stop offset="0" stopColor={p.glow} stopOpacity="0.55" />
							<stop offset="0.5" stopColor={p.rim} stopOpacity="0.18" />
							<stop offset="1" stopColor={p.rim} stopOpacity="0" />
						</radialGradient>
					</defs>
					<ellipse cx={540} cy={1420} rx={420} ry={560} fill={`url(#back${index})`} />
				</Canvas>
			</Layer>
			<Layer depth={0.7}>
				<Canvas>
					<RimLight id={`prim${index}`} color={p.rim} dx={5} dy={-3}>
						<Figure
							kind={ch.kind}
							action={ch.action ?? 'idle'}
							x={540}
							y={1880}
							scale={3.1 * (ch.scale ?? 1)}
							facing={ch.facing ?? 'right'}
							p={p}
						/>
					</RimLight>
				</Canvas>
			</Layer>
			<Particles kind="dust" count={45} />
			{visual.text && (
				<AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 300}}>
					<div
						style={{
							transform: `translateY(${(1 - plate) * -60}px)`,
							opacity: plate,
							textAlign: 'center',
							padding: '22px 46px',
							borderTop: `3px solid ${p.rim}`,
							borderBottom: `3px solid ${p.rim}`,
							background: 'rgba(0,0,0,0.45)',
						}}
					>
						<div style={{fontFamily: FONT_TITLE, fontWeight: 900, fontSize: 84, color: '#f0e6d0', letterSpacing: 4, lineHeight: 1.05}}>
							{visual.text}
						</div>
						{visual.subtext && (
							<div style={{fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 44, color: p.rim, marginTop: 10, letterSpacing: 6}}>
								{visual.subtext}
							</div>
						)}
					</div>
				</AbsoluteFill>
			)}
			{visual.lightning && <Lightning seed={`p${index}`} />}
			{/* sanftes Pulsieren des Lichts */}
			<AbsoluteFill style={{background: '#000', opacity: 0.12 + 0.08 * Math.sin(frame / 20), pointerEvents: 'none'}} />
		</AbsoluteFill>
	);
};

/** Pergament mit Jahreszahl/Fakt, Kerze und Siegel */
export const DocumentScene: React.FC<SceneProps> = ({visual, durationInFrames, p}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const unroll = interpolate(frame, [0, 18], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const textIn = spring({frame: frame - 14, fps, config: {damping: 12, mass: 0.8}});
	const write = interpolate(frame, [20, Math.min(durationInFrames - 10, 70)], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const paperH = 1000 * unroll;
	return (
		<AbsoluteFill style={{background: '#0a0604'}}>
			<Layer depth={0.1}>
				<Canvas>
					{/* Holztisch */}
					{new Array(14).fill(0).map((_, i) => (
						<rect key={i} x={-400} y={-300 + i * 180} width={1900} height={176} fill={i % 2 ? '#1c120a' : '#180f08'} />
					))}
				</Canvas>
			</Layer>
			<Layer depth={0.4}>
				<Canvas>
					<g transform="rotate(-3 540 960)">
						<rect x={140} y={960 - paperH / 2} width={800} height={paperH} fill={p.paper} />
						<rect x={140} y={960 - paperH / 2} width={800} height={paperH} fill="none" stroke="#8a6a3a" strokeWidth={6} opacity={0.6} />
						{/* Rollen oben/unten */}
						<rect x={120} y={940 - paperH / 2} width={840} height={44} rx={22} fill="#b89a68" />
						<rect x={120} y={940 + paperH / 2} width={840} height={44} rx={22} fill="#b89a68" />
						{/* Flecken */}
						{new Array(8).fill(0).map((_, i) => (
							<circle
								key={i}
								cx={200 + random(`sp${i}`) * 680}
								cy={960 - paperH / 2 + random(`sq${i}`) * paperH}
								r={20 + random(`sr${i}`) * 60}
								fill="#7a5a2a"
								opacity={0.12 * unroll}
							/>
						))}
						{/* geschriebene Zeilen */}
						{unroll > 0.9 &&
							new Array(7).fill(0).map((_, i) => {
								const w = 560 * Math.max(0, Math.min(1, write * 7 - i)) * (0.7 + random(`ln${i}`) * 0.3);
								return <rect key={i} x={260} y={1150 + i * 46} width={w} height={8} rx={4} fill={p.ink} opacity={0.55} />;
							})}
						{unroll > 0.9 && (
							<g transform={`translate(780 ${1420}) scale(${spring({frame: frame - 40, fps, config: {damping: 9}})})`}>
								<circle r={58} fill="#8a0d16" />
								<circle r={40} fill="none" stroke="#c03040" strokeWidth={4} />
								<text textAnchor="middle" y={14} fontFamily={FONT_TITLE} fontWeight={900} fontSize={40} fill="#e06070">
									DH
								</text>
							</g>
						)}
					</g>
				</Canvas>
			</Layer>
			<Layer depth={0.6}>
				<Canvas>
					<rect x={880} y={1500} width={70} height={240} fill="#d8ccb0" />
					<Flame x={915} y={1500} size={50} seed="cdl" p={p} />
				</Canvas>
			</Layer>
			{visual.text && (
				<AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-start', paddingTop: 640}}>
					<div
						style={{
							fontFamily: FONT_TITLE,
							fontWeight: 900,
							fontSize: visual.text.length > 10 ? 96 : 170,
							color: p.ink,
							transform: `scale(${0.6 + 0.4 * textIn}) rotate(-3deg)`,
							opacity: textIn,
							textAlign: 'center',
							maxWidth: 720,
							lineHeight: 1,
						}}
					>
						{visual.text}
					</div>
					{visual.subtext && (
						<div
							style={{
								fontFamily: FONT_TITLE,
								fontWeight: 700,
								fontSize: 46,
								color: '#5a1010',
								marginTop: 20,
								opacity: textIn,
								transform: 'rotate(-3deg)',
								maxWidth: 700,
								textAlign: 'center',
							}}
						>
							{visual.subtext}
						</div>
					)}
				</AbsoluteFill>
			)}
			<Particles kind="dust" count={25} />
		</AbsoluteFill>
	);
};

/** Hook-Szene: Text schlägt Buchstabe für Buchstabe ein, Blitz, Glut */
export const TitleScene: React.FC<SceneProps> = ({visual, p, index}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const text = visual.text ?? '';
	const words = text.split(' ');
	const flash = interpolate(frame, [0, 2, 10], [1, 0.7, 0], {extrapolateRight: 'clamp'});
	const chars = visual.characters ?? [];
	let letterIndex = 0;
	return (
		<AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 40%, ${p.skyBottom} 0%, ${p.skyMid} 35%, ${p.skyTop} 80%)`}}>
			<Layer depth={0.2}>
				<Canvas>
					{new Array(16).fill(0).map((_, i) => {
						const a = (i / 16) * Math.PI * 2 + frame / 200;
						return (
							<path
								key={i}
								d={`M 540 760 L ${540 + Math.cos(a) * 2000} ${760 + Math.sin(a) * 2000} L ${540 + Math.cos(a + 0.12) * 2000} ${760 + Math.sin(a + 0.12) * 2000} Z`}
								fill={p.glow}
								opacity={0.035}
							/>
						);
					})}
				</Canvas>
			</Layer>
			{chars.length > 0 && (
				<Layer depth={0.7}>
					<Canvas>
						<RimLight id={`trim${index}`} color={p.rim}>
							{chars.map((c, i) => (
								<Figure
									key={i}
									kind={c.kind}
									action={c.action ?? 'idle'}
									x={(c.x ?? 0.5) * 1080}
									y={1900}
									scale={3.4 * (c.scale ?? 1)}
									facing={c.facing ?? 'right'}
									p={p}
								/>
							))}
						</RimLight>
					</Canvas>
				</Layer>
			)}
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-start', paddingTop: 420}}>
				<div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 28px', maxWidth: 960}}>
					{words.map((w, wi) => (
						<span key={wi} style={{display: 'inline-flex'}}>
							{w.split('').map((ch, ci) => {
								const li = letterIndex++;
								const s = spring({frame: frame - li * 1.2, fps, config: {damping: 11, stiffness: 180}});
								return (
									<span
										key={ci}
										style={{
											fontFamily: FONT_TITLE,
											fontWeight: 900,
											fontSize: text.length > 18 ? 110 : 140,
											color: wi === words.length - 1 ? p.accent : '#f2e8d8',
											display: 'inline-block',
											transform: `scale(${2.2 - 1.2 * s}) translateY(${(1 - s) * -40}px)`,
											opacity: s,
											textShadow: '0 8px 30px rgba(0,0,0,0.9), 0 0 40px rgba(200,16,46,0.35)',
											lineHeight: 1.1,
										}}
									>
										{ch}
									</span>
								);
							})}
						</span>
					))}
				</div>
				{visual.subtext && (
					<div
						style={{
							fontFamily: FONT_TITLE,
							fontWeight: 700,
							fontSize: 48,
							color: p.rim,
							marginTop: 30,
							letterSpacing: 8,
							opacity: interpolate(frame, [12, 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
						}}
					>
						{visual.subtext}
					</div>
				)}
			</AbsoluteFill>
			<Particles kind="embers" count={50} />
			{visual.lightning !== false && <Lightning every={90} seed={`t${index}`} />}
			<AbsoluteFill style={{background: '#fff', opacity: flash}} />
		</AbsoluteFill>
	);
};
