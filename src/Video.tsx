import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {DEFAULT_CAMERA, DEFAULT_MOOD, SCENES} from '../scenes';
import {Vignette} from '../scenes/primitives/Environment';
import {CameraProvider} from './components/Camera';
import {Captions} from './components/Captions';
import {FONT_TITLE, palette} from './theme';
import type {ScriptScene, VideoProps} from './types';

const TRANSITION = 10; // Frames Überblendung

type TransitionKind = 'fade' | 'whip' | 'flash';
const transitionFor = (i: number): TransitionKind => (['whip', 'fade', 'flash'] as const)[i % 3];

const SceneSlot: React.FC<{scene: ScriptScene; index: number; durationInFrames: number; transition: TransitionKind | null}> = ({
	scene,
	index,
	durationInFrames,
	transition,
}) => {
	const frame = useCurrentFrame();
	const v = scene.visual;
	const Comp = SCENES[v.type] ?? SCENES.castle;
	const p = palette(v.mood ?? DEFAULT_MOOD[v.type]);
	const move = v.camera ?? DEFAULT_CAMERA[v.type];
	const shake = v.type === 'battle' ? 0.35 : v.lightning ? 0.1 : 0;

	let style: React.CSSProperties = {};
	let flash = 0;
	if (transition) {
		const t = interpolate(frame, [0, TRANSITION], [0, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.out(Easing.cubic),
		});
		if (transition === 'whip') style = {transform: `translateX(${(1 - t) * 100}%)`};
		else if (transition === 'fade') style = {opacity: t, transform: `scale(${1.08 - 0.08 * t})`};
		else {
			style = {opacity: t > 0.3 ? 1 : 0};
			flash = interpolate(frame, [0, 3, TRANSITION], [0.9, 0.6, 0], {extrapolateRight: 'clamp'});
		}
	}
	return (
		<AbsoluteFill style={{overflow: 'hidden', ...style}}>
			<CameraProvider move={move} durationInFrames={durationInFrames} shake={shake}>
				<Comp visual={v} durationInFrames={durationInFrames} p={p} index={index} />
			</CameraProvider>
			{flash > 0 && <AbsoluteFill style={{background: '#fff', opacity: flash}} />}
		</AbsoluteFill>
	);
};

const Branding: React.FC = () => (
	<AbsoluteFill style={{alignItems: 'center', paddingTop: 110, pointerEvents: 'none'}}>
		<div
			style={{
				fontFamily: FONT_TITLE,
				fontWeight: 900,
				fontSize: 34,
				letterSpacing: 12,
				color: 'rgba(240,230,210,0.75)',
				textShadow: '0 2px 10px #000',
				display: 'flex',
				alignItems: 'center',
				gap: 16,
			}}
		>
			<span style={{width: 14, height: 14, borderRadius: 7, background: '#c8102e', display: 'inline-block'}} />
			DARK HISTORY
		</div>
	</AbsoluteFill>
);

export const DarkHistoryVideo: React.FC<VideoProps> = ({script, timeline, audio}) => {
	const {fps, durationInFrames} = useVideoConfig();
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{script.scenes.map((scene, i) => {
				const st = timeline.scenes[i];
				if (!st) return null;
				const from = Math.round(st.start * fps);
				const isLast = i === script.scenes.length - 1;
				const to = isLast ? durationInFrames : Math.round(st.end * fps) + TRANSITION;
				return (
					<Sequence key={i} from={from} durationInFrames={Math.max(1, to - from)} name={`Szene ${i + 1}: ${scene.visual.type}`}>
						<SceneSlot scene={scene} index={i} durationInFrames={to - from} transition={i === 0 ? null : transitionFor(i)} />
					</Sequence>
				);
			})}
			<Vignette />
			<Branding />
			<Captions words={timeline.words} scenes={script.scenes} />
			{audio && <Audio src={staticFile(audio)} />}
		</AbsoluteFill>
	);
};
