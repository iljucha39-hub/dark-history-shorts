import React from 'react';
import {useCurrentFrame} from 'remotion';
import type {CharacterKind} from '../../src/types';
import type {Palette} from '../../src/theme';

/**
 * Profil-Büste für Nahaufnahmen: Kopf im Seitenprofil (Stirn, Nase, Lippen, Kinn),
 * Schultern und typische Kopfbedeckung je Figurentyp. Ursprung = Halsansatz,
 * Blickrichtung rechts. Atmet, nickt leicht und blinzelt.
 */

const HEAD =
	'M -60 40 C -95 -40 -130 -150 -105 -240 C -85 -330 10 -365 70 -330 C 100 -312 108 -270 102 -240 ' +
	'L 110 -225 L 142 -170 L 108 -160 L 112 -140 L 104 -132 L 110 -118 L 100 -110 ' +
	'C 104 -80 90 -62 60 -60 L 40 -30 L 40 40 Z';

const SHOULDERS = 'M -290 420 C -280 130 -160 40 -60 28 L 50 28 C 160 40 280 130 290 420 Z';

const Headwear: React.FC<{kind: CharacterKind; p: Palette; frame: number}> = ({kind, p, frame}) => {
	const dark = p.near;
	switch (kind) {
		case 'king':
		case 'queen':
			return (
				<path
					d="M -95 -300 L -95 -390 L -55 -340 L -15 -410 L 25 -345 L 65 -400 L 75 -310 Z"
					fill="#e0b23a"
					stroke="#fff0a0"
					strokeWidth={4}
				/>
			);
		case 'knight':
			return (
				<g>
					<path d="M -125 -360 L 120 -360 L 135 -60 L 40 -40 L -115 -20 Z" fill="#3a3f48" />
					<rect x={40} y={-250} width={100} height={14} fill="#000" />
					<path d="M -125 -360 L 120 -360" stroke={p.rim} strokeWidth={6} opacity={0.7} />
				</g>
			);
		case 'soldier':
			return (
				<g>
					<path d="M -200 -300 Q -20 -330 200 -300 L 120 -310 Q -10 -430 -130 -310 Z" fill="#4a4e56" />
				</g>
			);
		case 'viking':
			return <path d="M -110 -260 Q -100 -380 10 -380 Q 115 -375 112 -260 Z M 88 -270 L 106 -270 L 112 -175 L 96 -175 Z" fill="#5a5e66" />;
		case 'monk':
		case 'archer':
		case 'executioner':
			return (
				<path
					d={
						kind === 'executioner'
							? 'M -140 60 Q -170 -300 0 -390 Q 150 -360 150 -60 L 60 -40 Z'
							: 'M -160 80 Q -180 -280 -20 -380 Q 120 -390 140 -260 Q 110 -230 85 -250 Q 40 -320 -40 -290 Q -100 -200 -60 60 Z'
					}
					fill={kind === 'archer' ? '#1e2a18' : kind === 'monk' ? '#3a2c1c' : '#0a0606'}
				/>
			);
		case 'plagueDoctor':
			return (
				<g>
					<path d="M 95 -215 Q 260 -150 300 -60 Q 230 -100 100 -140 Z" fill="#4a3c2c" stroke="#8a7458" strokeWidth={3} />
					<circle cx={72} cy={-238} r={22} fill="#d8c070" opacity={0.85} />
					<ellipse cx={-10} cy={-330} rx={210} ry={30} fill={dark} />
					<path d="M -110 -340 Q -100 -470 0 -470 Q 100 -470 110 -340 Z" fill={dark} />
				</g>
			);
		case 'noble':
			return (
				<g>
					<ellipse cx={-10} cy={-330} rx={120} ry={38} fill="#2a1030" />
					<path d={`M 40 -345 Q ${150 + Math.sin(frame / 10) * 8} -470 200 -440 Q 140 -420 70 -335 Z`} fill="#e8dcc8" />
				</g>
			);
		default:
			return null;
	}
};

const CLOTH: Partial<Record<CharacterKind, string>> = {
	king: '#5a0d12',
	queen: '#3a1446',
	knight: '#2c3038',
	noble: '#1a2030',
	monk: '#3a2c1c',
	plagueDoctor: '#141210',
	executioner: '#100808',
};

export const Bust: React.FC<{
	kind: CharacterKind;
	x: number;
	y: number;
	scale?: number;
	facing?: 'left' | 'right';
	p: Palette;
}> = ({kind, x, y, scale = 2.2, facing = 'right', p}) => {
	const frame = useCurrentFrame();
	const breathe = Math.sin(frame / 20) * 6;
	const nod = Math.sin(frame / 37) * 1.8;
	const blink = frame % 110 < 4 ? 0.1 : 1;
	const beard = kind === 'king' || kind === 'viking' || kind === 'noble';
	const eyeGlow = kind === 'executioner' ? '#c8102e' : null;
	const cloth = CLOTH[kind] ?? p.near;
	return (
		<g transform={`translate(${x} ${y + breathe}) scale(${facing === 'left' ? -scale : scale} ${scale})`}>
			{/* Umhang/Schultern */}
			<path d={SHOULDERS} fill={p.near} />
			<path d="M -250 420 C -230 170 -140 80 -40 60 L -20 420 Z" fill={cloth} opacity={0.85} />
			{kind === 'knight' && <path d="M -40 60 L 60 60 L 70 420 L -50 420 Z" fill="#e8e0d0" opacity={0.9} />}
			{kind === 'knight' && <rect x={-6} y={120} width={24} height={200} fill={p.accent} />}
			{kind === 'queen' && <path d="M -100 -250 Q -170 -40 -120 160 L -40 120 Q -80 -60 -60 -240 Z" fill="#120a06" />}
			<g transform={`rotate(${nod} 0 0)`}>
				<path d={HEAD} fill={p.near} />
				{beard && <path d="M 100 -110 C 110 -40 60 10 -20 -10 L 30 -70 Z" fill="#160e08" />}
				{kind !== 'knight' && kind !== 'executioner' && (
					<g transform={`translate(68 -238) scale(1 ${blink})`}>
						<path d="M -16 0 Q 0 -10 18 0 Q 0 9 -16 0 Z" fill="#f2e6d0" opacity={0.85} />
						<circle cx={6} cy={0} r={5} fill="#120a06" />
					</g>
				)}
				{eyeGlow && (
					<g>
						<circle cx={70} cy={-238} r={10} fill={eyeGlow} />
						<circle cx={70} cy={-238} r={26} fill={eyeGlow} opacity={0.3} />
					</g>
				)}
				<Headwear kind={kind} p={p} frame={frame} />
			</g>
		</g>
	);
};
