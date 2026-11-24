import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import type {CameraMove} from '../types';

export interface CameraState {
	/** Verschiebung in px (positiv = Kamera nach rechts/unten) */
	x: number;
	y: number;
	zoom: number;
	rotate: number;
}

const CameraContext = createContext<CameraState>({x: 0, y: 0, zoom: 1, rotate: 0});

export const useCamera = () => useContext(CameraContext);

const ease = Easing.bezier(0.45, 0, 0.25, 1);

export const cameraAt = (
	move: CameraMove,
	frame: number,
	duration: number,
	shake: number,
): CameraState => {
	const t = interpolate(frame, [0, Math.max(1, duration)], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: ease,
	});
	let s: CameraState = {x: 0, y: 0, zoom: 1, rotate: 0};
	switch (move) {
		case 'pushIn':
			s = {x: 0, y: -20 * t, zoom: 1 + 0.22 * t, rotate: 0};
			break;
		case 'pullOut':
			s = {x: 0, y: 20 * (1 - t), zoom: 1.25 - 0.25 * t, rotate: 0};
			break;
		case 'panLeft':
			s = {x: 160 - 320 * t, y: 0, zoom: 1.08, rotate: 0};
			break;
		case 'panRight':
			s = {x: -160 + 320 * t, y: 0, zoom: 1.08, rotate: 0};
			break;
		case 'tiltUp':
			s = {x: 0, y: 220 - 440 * t, zoom: 1.12, rotate: 0};
			break;
		case 'tiltDown':
			s = {x: 0, y: -220 + 440 * t, zoom: 1.12, rotate: 0};
			break;
		case 'punchIn': {
			const p = interpolate(frame, [0, 10], [0, 1], {
				extrapolateRight: 'clamp',
				easing: Easing.out(Easing.cubic),
			});
			s = {x: 0, y: 0, zoom: 1.35 - 0.25 * p + 0.06 * t, rotate: -1.5 * (1 - p)};
			break;
		}
		case 'drift':
		default:
			s = {
				x: Math.sin(frame / 50) * 40,
				y: Math.cos(frame / 70) * 20,
				zoom: 1.06 + 0.04 * t,
				rotate: Math.sin(frame / 90) * 0.6,
			};
	}
	if (shake > 0) {
		s.x += (random(`sx${frame}`) - 0.5) * 24 * shake;
		s.y += (random(`sy${frame}`) - 0.5) * 24 * shake;
		s.rotate += (random(`sr${frame}`) - 0.5) * 1.2 * shake;
	}
	return s;
};

const CUT_MOVES: CameraMove[] = ['pushIn', 'panRight', 'tiltUp', 'panLeft', 'pullOut', 'tiltDown'];
/** Länge eines Kamera-Abschnitts in Frames (≈ 2,5 s bei 30 FPS) */
export const CUT_FRAMES = 75;

export const CameraProvider: React.FC<{
	move: CameraMove;
	durationInFrames: number;
	/** 0..1 Kamerawackeln (Schlachten, Explosionen) */
	shake?: number;
	/** Szene in Abschnitte mit wechselnder Kameraeinstellung schneiden (schnelleres Tempo) */
	cuts?: boolean;
	children: React.ReactNode;
}> = ({move, durationInFrames, shake = 0, cuts = false, children}) => {
	const frame = useCurrentFrame();
	let cam: CameraState;
	if (!cuts || durationInFrames < CUT_FRAMES * 1.5) {
		cam = cameraAt(move, frame, durationInFrames, shake);
	} else {
		// Abschnitte; ein zu kurzer Rest wird dem letzten Abschnitt zugeschlagen
		const n = Math.max(1, Math.floor(durationInFrames / CUT_FRAMES));
		const seg = Math.min(n - 1, Math.floor(frame / CUT_FRAMES));
		const segStart = seg * CUT_FRAMES;
		const segLen = seg === n - 1 ? durationInFrames - segStart : CUT_FRAMES;
		const startIdx = Math.max(0, CUT_MOVES.indexOf(move));
		const m = seg === 0 ? move : CUT_MOVES[(startIdx + seg * 2) % CUT_MOVES.length];
		cam = cameraAt(m, frame - segStart, segLen, shake);
		// Zoom-Ruck am Schnitt
		if (seg > 0) {
			const k = frame - segStart;
			cam.zoom *= 1 + 0.07 * Math.max(0, 1 - k / 6);
		}
		// jeder zweite Abschnitt enger (Nahaufnahme-Gefühl)
		if (seg % 2 === 1) cam.zoom *= 1.12;
	}
	return <CameraContext.Provider value={cam}>{children}</CameraContext.Provider>;
};

/**
 * Parallax-Ebene: depth 0 = unendlich weit (bewegt sich kaum), 1 = Vordergrund.
 * Alle Szenen setzen sich aus mehreren Ebenen zusammen, dadurch entsteht bei
 * Kamerafahrten echte Tiefe statt eines verschobenen Standbilds.
 */
export const Layer: React.FC<{depth: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
	depth,
	children,
	style,
}) => {
	const cam = useCamera();
	const z = 1 + (cam.zoom - 1) * (0.35 + depth * 0.9);
	const tx = -cam.x * (0.15 + depth);
	const ty = -cam.y * (0.15 + depth);
	return (
		<AbsoluteFill
			style={{
				transform: `translate(${tx}px, ${ty}px) scale(${z}) rotate(${cam.rotate * depth}deg)`,
				transformOrigin: '50% 55%',
				...style,
			}}
		>
			{children}
		</AbsoluteFill>
	);
};

/** SVG-Leinwand in Videokoordinaten 1080×1920, darf über den Rand zeichnen. */
export const Canvas: React.FC<{children: React.ReactNode}> = ({children}) => (
	<svg
		viewBox="0 0 1080 1920"
		width={1080}
		height={1920}
		style={{position: 'absolute', inset: 0, overflow: 'visible'}}
	>
		{children}
	</svg>
);
