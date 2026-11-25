import React from 'react';
import {useCurrentFrame} from 'remotion';
import type {CharacterAction, CharacterKind} from '../../src/types';
import type {Palette} from '../../src/theme';

/**
 * Parametrische 2D-Figur mit Skelett (Hüfte, Knie, Schulter, Ellbogen, Kopf).
 * Alle Gelenke werden pro Frame aus der Aktion berechnet – dadurch laufen,
 * kämpfen und gestikulieren die Figuren tatsächlich.
 * Koordinaten: Füße bei (0,0), Kopf bei ca. y=-190, Blickrichtung rechts.
 */

interface Pose {
	bodyY: number;
	lean: number; // Grad, + = nach vorn
	head: number; // Kopfneigung
	hipL: number;
	kneeL: number;
	hipR: number;
	kneeR: number;
	shL: number; // hinterer Arm
	elL: number;
	shR: number; // vorderer Arm (Waffenhand)
	elR: number;
}

const D = Math.PI / 180;

const poseFor = (action: CharacterAction, t: number, seed: number): Pose => {
	const ph = t + seed;
	const s = Math.sin(ph);
	const c = Math.cos(ph);
	const base: Pose = {
		bodyY: 0,
		lean: 0,
		head: 0,
		hipL: 0,
		kneeL: 0,
		hipR: 0,
		kneeR: 0,
		shL: 6,
		elL: 8,
		shR: -6,
		elR: 8,
	};
	switch (action) {
		case 'walk':
		case 'march': {
			const amp = action === 'march' ? 22 : 26;
			return {
				...base,
				bodyY: -Math.abs(c) * 4,
				lean: 3,
				hipL: s * amp,
				kneeL: Math.max(0, -c) * 35 + 5,
				hipR: -s * amp,
				kneeR: Math.max(0, c) * 35 + 5,
				shL: -s * (action === 'march' ? 6 : 22),
				elL: 14,
				shR: action === 'march' ? 25 : s * 22,
				elR: action === 'march' ? 70 : 16,
			};
		}
		case 'run':
			return {
				...base,
				bodyY: -Math.abs(c) * 9,
				lean: 14,
				head: -6,
				hipL: s * 42,
				kneeL: Math.max(0, -c) * 70 + 10,
				hipR: -s * 42,
				kneeR: Math.max(0, c) * 70 + 10,
				shL: -s * 45,
				elL: 75,
				shR: s * 45,
				elR: 75,
			};
		case 'fight': {
			// Ausholen – Schlag – Zurückziehen
			const cyc = (ph / (Math.PI * 2)) % 1;
			const swing =
				cyc < 0.55 ? -150 + cyc * 40 : cyc < 0.7 ? -128 + ((cyc - 0.55) / 0.15) * 200 : 72 - ((cyc - 0.7) / 0.3) * 222;
			return {
				...base,
				lean: cyc > 0.55 && cyc < 0.8 ? 14 : 2,
				hipL: -18,
				kneeL: 22,
				hipR: 22,
				kneeR: 10,
				shL: 40,
				elL: 60,
				shR: swing,
				elR: 18,
				bodyY: -2,
			};
		}
		case 'point':
			return {
				...base,
				lean: 4,
				shR: 82 + Math.sin(ph * 3) * 3,
				elR: 4,
				shL: 4,
				hipL: -6,
				hipR: 6,
			};
		case 'raiseArm':
			return {
				...base,
				shR: 160 + s * 12,
				elR: 10 + c * 8,
				head: -8,
				bodyY: -Math.abs(s) * 2,
			};
		case 'cower':
			return {
				...base,
				bodyY: 18,
				lean: -10,
				head: 12,
				hipL: 40,
				kneeL: 70,
				hipR: 20,
				kneeR: 55,
				shL: 70 + s * 4,
				elL: 110,
				shR: 80 + c * 4,
				elR: 115,
			};
		case 'pray':
			return {
				...base,
				head: 18,
				lean: 6,
				shL: 30,
				elL: 95,
				shR: 34,
				elR: 92,
				bodyY: Math.sin(ph / 2) * 1,
			};
		case 'idle':
		default:
			return {
				...base,
				bodyY: Math.sin(ph / 2) * 1.5,
				head: Math.sin(ph / 3) * 3,
				shL: 6 + Math.sin(ph / 2) * 2,
				shR: -6 - Math.sin(ph / 2) * 2,
			};
	}
};

const STEEL = '#2c3038';
const CLOTH = '#1c1613';
const DARK = '#0c0a09';

interface Look {
	body: string;
	limbs: string;
	robe?: string; // langes Gewand statt Beine
	cape?: string;
	head: 'helm' | 'kettle' | 'hood' | 'crown' | 'cowl' | 'coif' | 'beak' | 'executioner' | 'cap' | 'nasal' | 'bare' | 'turban';
	weapon?: 'sword' | 'spear' | 'bow' | 'axe' | 'torch' | 'staff' | 'pitchfork' | 'book';
	shield?: 'kite' | 'round';
	beard?: boolean;
	hair?: boolean;
	tabard?: boolean;
	eyes?: string;
}

const LOOKS: Record<CharacterKind, Look> = {
	knight: {body: STEEL, limbs: STEEL, head: 'helm', weapon: 'sword', shield: 'kite', tabard: true, cape: '#2a0a0c'},
	soldier: {body: '#2a2218', limbs: '#1f1a14', head: 'kettle', weapon: 'spear', shield: 'round'},
	archer: {body: '#1d2416', limbs: '#181c12', head: 'hood', weapon: 'bow'},
	king: {body: '#3a0d10', limbs: CLOTH, head: 'crown', robe: '#2e0a0d', cape: '#4a0f14', weapon: 'sword', beard: true},
	queen: {body: '#24102e', limbs: CLOTH, head: 'crown', robe: '#1e0c26', hair: true},
	monk: {body: '#2a2016', limbs: '#2a2016', head: 'cowl', robe: '#241b12', weapon: 'book'},
	peasant: {body: '#2b2117', limbs: '#211a12', head: 'coif', weapon: 'pitchfork'},
	plagueDoctor: {body: '#221d18', limbs: '#1c1814', head: 'beak', robe: '#26201a', weapon: 'staff', eyes: '#e8d080'},
	executioner: {body: '#1a1010', limbs: '#3a2a22', head: 'executioner', weapon: 'axe', eyes: '#c8102e'},
	noble: {body: '#1a2030', limbs: CLOTH, head: 'cap', cape: '#2a1030', weapon: 'sword', beard: true},
	viking: {body: '#2a2218', limbs: '#221b13', head: 'nasal', weapon: 'axe', shield: 'round', beard: true},
	sultan: {body: '#1d3a2a', limbs: CLOTH, head: 'turban', robe: '#16301f', cape: '#5a0d12', weapon: 'sword', beard: true},
};

const UPRIGHT = new Set(['spear', 'staff', 'pitchfork', 'torch', 'book']);

const Limb: React.FC<{len: number; w: number; color: string}> = ({len, w, color}) => (
	<path d={`M ${-w / 2} 0 L ${w / 2} 0 L ${w * 0.4} ${len} L ${-w * 0.4} ${len} Z`} fill={color} strokeLinejoin="round" />
);

const Weapon: React.FC<{kind: NonNullable<Look['weapon']>; p: Palette; frame: number}> = ({kind, p, frame}) => {
	switch (kind) {
		case 'sword':
			return (
				<g>
					<rect x={-3} y={-6} width={6} height={14} fill="#3a2a1a" />
					<rect x={-12} y={6} width={24} height={4} fill="#6a6a70" />
					<path d="M -3 10 L 3 10 L 2 92 L 0 100 L -2 92 Z" fill="#9aa0aa" />
					<path d="M 0 10 L 2 10 L 1.5 92 L 0 100 Z" fill={p.rim} opacity={0.6} />
				</g>
			);
		case 'spear':
			return (
				<g>
					<rect x={-2.5} y={-120} width={5} height={210} fill="#3a2816" />
					<path d="M -6 -118 L 0 -150 L 6 -118 Z" fill="#9aa0aa" />
				</g>
			);
		case 'axe':
			return (
				<g>
					<rect x={-3} y={-10} width={6} height={130} fill="#3a2816" />
					<path d="M 3 82 Q 44 72 48 116 Q 30 106 3 112 Z" fill="#8a9098" />
					<path d="M 3 82 Q 44 72 48 116" stroke={p.rim} strokeWidth={2} fill="none" opacity={0.6} />
				</g>
			);
		case 'torch': {
			const fl = 1 + 0.2 * Math.sin(frame / 2.3);
			return (
				<g>
					<rect x={-3} y={-60} width={6} height={70} fill="#3a2816" />
					<circle cx={0} cy={-70} r={50 * fl} fill={p.glow} opacity={0.15} />
					<path d={`M -9 -60 Q -10 -80 0 ${-96 * fl} Q 10 -80 9 -60 Z`} fill="#ff7a20" />
					<path d={`M -4 -60 Q -5 -72 0 ${-84 * fl} Q 5 -72 4 -60 Z`} fill="#ffd060" />
				</g>
			);
		}
		case 'staff':
			return <rect x={-2.5} y={-30} width={5} height={130} fill="#2a1c10" />;
		case 'pitchfork':
			return (
				<g>
					<rect x={-2.5} y={-110} width={5} height={200} fill="#3a2816" />
					<path d="M -12 -110 L -12 -140 M 0 -110 L 0 -145 M 12 -110 L 12 -140 M -12 -110 L 12 -110" stroke="#6a6a6a" strokeWidth={4} fill="none" />
				</g>
			);
		case 'book':
			return <rect x={-14} y={-4} width={26} height={20} fill="#4a2a14" stroke="#c8a060" strokeWidth={1.5} />;
		case 'bow':
			return (
				<g>
					<path d="M 0 -70 Q 45 0 0 70" stroke="#4a3018" strokeWidth={5} fill="none" />
					<line x1={0} y1={-70} x2={0} y2={70} stroke="#ccc" strokeWidth={1} />
				</g>
			);
		default:
			return null;
	}
};

const Head: React.FC<{look: Look; p: Palette; frame: number}> = ({look, p}) => {
	const skin = '#2a1c16';
	const items: React.ReactNode[] = [];
	if (look.hair) items.push(<path key="hair" d="M -16 -6 Q -22 30 -12 44 L 10 40 Q 4 20 8 -4 Z" fill="#120a06" />);
	items.push(<ellipse key="face" cx={0} cy={0} rx={15} ry={17} fill={skin} />);
	if (look.beard) items.push(<path key="beard" d="M -6 6 Q 2 30 16 12 L 14 2 Z" fill="#160e08" />);
	switch (look.head) {
		case 'helm':
			items.push(
				<g key="h">
					<path d="M -17 -20 L 17 -20 L 18 18 L -17 18 Z" fill="#3a3f48" />
					<rect x={2} y={-4} width={16} height={4} fill="#000" />
					<path d="M -17 -20 Q 0 -30 17 -20" fill="#4a505a" />
				</g>,
			);
			break;
		case 'kettle':
			items.push(<path key="h" d="M -30 -6 Q 0 -14 30 -6 L 16 -10 Q 0 -34 -16 -10 Z" fill="#4a4e56" />);
			break;
		case 'hood':
		case 'cowl':
			items.push(
				<path key="h" d="M -20 24 Q -26 -10 -6 -24 Q 16 -30 22 -4 Q 20 6 14 8 Q 8 -10 -2 -10 Q -8 10 -4 24 Z" fill={look.head === 'cowl' ? '#2e2418' : '#1e2818'} />,
			);
			break;
		case 'crown':
			items.push(
				<path key="h" d="M -15 -12 L -15 -30 L -8 -20 L 0 -34 L 8 -20 L 15 -30 L 15 -12 Z" fill="#d4a830" stroke="#ffe080" strokeWidth={1} />,
			);
			break;
		case 'coif':
			items.push(<path key="h" d="M -17 4 Q -18 -22 0 -21 Q 16 -20 16 -6 L 6 -10 Q -6 -12 -10 6 Z" fill="#3a3024" />);
			break;
		case 'cap':
			items.push(
				<g key="h">
					<ellipse cx={0} cy={-15} rx={20} ry={8} fill="#2a1030" />
					<path d="M 6 -18 Q 30 -40 38 -30 Q 24 -28 10 -16 Z" fill="#c8b8a0" />
				</g>,
			);
			break;
		case 'beak':
			items.push(
				<g key="h">
					<path d="M -16 -4 Q -18 22 0 22 L 10 10 Q 50 34 58 30 Q 40 14 14 -2 Z" fill="#4a3c2c" stroke="#8a7458" strokeWidth={1.5} />
					<ellipse cx={-2} cy={-16} rx={36} ry={7} fill="#0e0d0b" />
					<path d="M -16 -16 Q -14 -42 0 -42 Q 14 -42 16 -16 Z" fill="#0e0d0b" />
				</g>,
			);
			break;
		case 'executioner':
			items.push(<path key="h" d="M -18 22 Q -22 -24 0 -30 Q 22 -24 18 22 Z" fill="#0a0606" />);
			break;
		case 'turban':
			items.push(
				<g key="h">
					<ellipse cx={0} cy={-18} rx={24} ry={18} fill="#ece4d4" />
					<ellipse cx={0} cy={-32} rx={12} ry={9} fill="#c8102e" />
				</g>,
			);
			break;
		case 'nasal':
			items.push(
				<g key="h">
					<path d="M -16 -4 Q -16 -26 0 -26 Q 16 -26 16 -4 Z" fill="#5a5e66" />
					<rect x={6} y={-6} width={4} height={16} fill="#5a5e66" />
				</g>,
			);
			break;
		default:
			break;
	}
	if (look.eyes) {
		items.push(
			<g key="eyes">
				<circle cx={6} cy={-2} r={3} fill={look.eyes} />
				<circle cx={6} cy={-2} r={7} fill={look.eyes} opacity={0.25} />
			</g>,
		);
	}
	return <g>{items}</g>;
};

export const Figure: React.FC<{
	kind: CharacterKind;
	action?: CharacterAction;
	x: number;
	y: number;
	scale?: number;
	facing?: 'left' | 'right';
	p: Palette;
	/** Animationsgeschwindigkeit */
	speed?: number;
	seed?: number;
}> = ({kind, action = 'idle', x, y, scale = 1, facing = 'right', p, speed = 1, seed = 0}) => {
	const frame = useCurrentFrame();
	const look = LOOKS[kind] ?? LOOKS.peasant;
	const rate = action === 'run' ? 0.36 : action === 'fight' ? 0.16 : action === 'idle' || action === 'pray' ? 0.08 : 0.22;
	const pose = poseFor(action, frame * rate * speed, seed);
	const thigh = 46;
	const shin = 46;
	const upper = 36;
	const fore = 34;
	const hipY = -92;
	const shY = -152;

	const leg = (hip: number, knee: number, key: string, back: boolean) => (
		<g key={key} transform={`translate(${back ? -4 : 4} ${hipY}) rotate(${-hip})`}>
			<Limb len={thigh} w={15} color={back ? DARK : look.limbs} />
			<g transform={`translate(0 ${thigh}) rotate(${knee})`}>
				<Limb len={shin} w={12} color={back ? DARK : look.limbs} />
				<path d={`M -6 ${shin - 4} L 16 ${shin - 2} L 16 ${shin + 2} L -6 ${shin + 2} Z`} fill={DARK} />
			</g>
		</g>
	);

	const arm = (sh: number, el: number, key: string, back: boolean, holds?: React.ReactNode, upright = false) => (
		<g key={key} transform={`translate(${back ? -6 : 6} ${shY}) rotate(${-sh})`}>
			<Limb len={upper} w={12} color={back ? DARK : look.limbs} />
			<g transform={`translate(0 ${upper}) rotate(${-el})`}>
				<Limb len={fore} w={10} color={back ? DARK : look.limbs} />
				<circle cx={0} cy={fore + 3} r={5.5} fill="#2a1c16" />
				{holds && (
					<g transform={`translate(0 ${fore + 3}) rotate(${upright ? sh + el : 0})`}>{holds}</g>
				)}
			</g>
		</g>
	);

	const sway = Math.sin(frame / 9 + seed) * 4;
	const weapon = look.weapon ? <Weapon kind={look.weapon} p={p} frame={frame} /> : undefined;
	const shield =
		look.shield === 'kite' ? (
			<path d="M -20 -20 L 20 -20 L 18 10 L 0 44 L -18 10 Z" fill="#3a0d10" stroke="#6a6a70" strokeWidth={3} />
		) : look.shield === 'round' ? (
			<g>
				<circle r={26} fill="#3a2a18" stroke="#5a5a5a" strokeWidth={3} />
				<circle r={6} fill="#6a6a6a" />
			</g>
		) : undefined;

	return (
		<g transform={`translate(${x} ${y}) scale(${facing === 'left' ? -scale : scale} ${scale})`}>
			{/* Schatten */}
			<ellipse cx={0} cy={2} rx={34} ry={6} fill="#000" opacity={0.45} />
			<g transform={`translate(0 ${pose.bodyY}) rotate(${pose.lean * 0.5} 0 ${hipY})`}>
				{look.cape && (
					<path
						d={`M -12 ${shY - 2} Q ${-30 - sway} ${shY + 60} ${-34 - sway * 1.5} ${-20} L 4 -24 L 10 ${shY + 4} Z`}
						fill={look.cape}
					/>
				)}
				{arm(pose.shL, pose.elL, 'al', true, shield)}
				{!look.robe && leg(pose.hipL, pose.kneeL, 'll', true)}
				{!look.robe && leg(pose.hipR, pose.kneeR, 'lr', false)}
				{look.robe && (
					<g>
						{leg(pose.hipL * 0.4, pose.kneeL * 0.3, 'll', true)}
						{leg(pose.hipR * 0.4, pose.kneeR * 0.3, 'lr', false)}
						<path
							d={`M -16 ${hipY - 6} L 16 ${hipY - 6} L ${26 + sway} -8 Q 0 ${-2 + Math.abs(sway)} ${-28 + sway} -8 Z`}
							fill={look.robe}
						/>
					</g>
				)}
				{/* Torso */}
				<g transform={`rotate(${pose.lean * 0.5} 0 ${hipY})`}>
					<path d={`M -15 ${shY - 6} Q 0 ${shY - 12} 15 ${shY - 6} L 13 ${hipY + 4} L -13 ${hipY + 4} Z`} fill={look.body} />
					{look.tabard && (
						<g>
							<path d={`M -9 ${shY + 4} L 9 ${shY + 4} L 10 ${hipY + 26} L -10 ${hipY + 26} Z`} fill="#e8e0d0" opacity={0.85} />
							<rect x={-2.5} y={shY + 10} width={5} height={50} fill={p.accent} />
							<rect x={-9} y={shY + 24} width={18} height={5} fill={p.accent} />
						</g>
					)}
					<rect x={-14} y={hipY - 4} width={28} height={5} fill="#120c08" />
					<g transform={`translate(2 ${shY - 22}) rotate(${pose.head})`}>
						<Head look={look} p={p} frame={frame} />
					</g>
				</g>
				{arm(pose.shR, pose.elR, 'ar', false, weapon, UPRIGHT.has(look.weapon ?? ''))}
			</g>
		</g>
	);
};

/**
 * Kantenlicht-Filter: legt eine helle Kontur auf die dem Licht zugewandte Seite
 * aller Figuren in der Gruppe (ein Filter pro Gruppe = schnelleres Rendern).
 */
export const RimLight: React.FC<{id: string; color: string; dx?: number; dy?: number; children: React.ReactNode}> = ({
	id,
	color,
	dx = 3,
	dy = -2,
	children,
}) => (
	<>
		<defs>
			<filter id={id} x="-20%" y="-20%" width="140%" height="140%">
				<feOffset in="SourceAlpha" dx={-dx} dy={-dy} result="off" />
				<feComposite in="SourceAlpha" in2="off" operator="out" result="edge" />
				<feFlood floodColor={color} floodOpacity={0.85} />
				<feComposite in2="edge" operator="in" result="rim" />
				<feMerge>
					<feMergeNode in="SourceGraphic" />
					<feMergeNode in="rim" />
				</feMerge>
			</filter>
		</defs>
		<g filter={`url(#${id})`}>{children}</g>
	</>
);
