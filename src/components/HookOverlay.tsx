import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT_HOOK} from '../theme';

/**
 * Großer Cover-Titel (wie ein Thumbnail): obere Zeile weiß, darunter groß in Rot.
 * Steht im unteren Bilddrittel, dick und mit Schatten – im Profilraster sofort lesbar.
 */
export const HookOverlay: React.FC<{top?: string; main: string; durationInFrames: number}> = ({
	top,
	main,
	durationInFrames,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const pop = spring({frame, fps, config: {damping: 12, stiffness: 220, mass: 0.7}});
	const pop2 = spring({frame: frame - 4, fps, config: {damping: 10, stiffness: 200, mass: 0.8}});
	const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const longest = (s: string) => Math.max(1, ...s.split(/\s+/).map((w) => w.length));
	// Anton ist schmal: ca. 0,5 em pro Großbuchstabe
	const mainSize = Math.min(190, Math.floor(980 / (longest(main) * 0.52)));
	const topSize = top ? Math.min(92, Math.floor(980 / (top.length * 0.5))) : 0;
	const shadow = '0 6px 0 #000, 0 10px 30px rgba(0,0,0,0.9)';
	return (
		<AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 470, opacity: out}}>
			<AbsoluteFill
				style={{background: 'linear-gradient(to bottom, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)'}}
			/>
			<div style={{textAlign: 'center', width: 1000, position: 'relative'}}>
				{top && (
					<div
						style={{
							fontFamily: FONT_HOOK,
							fontSize: topSize,
							lineHeight: 1.05,
							color: '#ffffff',
							textTransform: 'uppercase',
							WebkitTextStroke: '6px #000',
							paintOrder: 'stroke fill',
							textShadow: shadow,
							transform: `scale(${0.6 + 0.4 * pop})`,
							opacity: pop,
						}}
					>
						{top}
					</div>
				)}
				<div
					style={{
						fontFamily: FONT_HOOK,
						fontSize: mainSize,
						lineHeight: 1.0,
						color: '#e8132b',
						textTransform: 'uppercase',
						WebkitTextStroke: '8px #000',
						paintOrder: 'stroke fill',
						textShadow: shadow,
						transform: `scale(${1.4 - 0.4 * pop2})`,
						opacity: Math.min(1, pop2 * 1.4),
					}}
				>
					{main}
				</div>
			</div>
		</AbsoluteFill>
	);
};
