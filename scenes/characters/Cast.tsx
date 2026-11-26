import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Canvas, Layer} from '../../src/components/Camera';
import type {CharacterSpec} from '../../src/types';
import type {Palette} from '../../src/theme';
import {Figure, RimLight} from './Figure';

/** Rendert die im Skript angegebenen Figuren auf einer Bodenlinie. */
export const Cast: React.FC<{
	characters: CharacterSpec[];
	groundY: number;
	p: Palette;
	durationInFrames: number;
	baseScale?: number;
	depth?: number;
	id: string;
}> = ({characters, groundY, p, durationInFrames, baseScale = 2.2, depth = 0.85, id}) => {
	const frame = useCurrentFrame();
	const prog = frame / Math.max(1, durationInFrames);
	return (
		<Layer depth={depth}>
			<Canvas>
				<RimLight id={`rim-${id}`} color={p.rim}>
					{characters.map((c, i) => {
						const moving = c.action === 'walk' || c.action === 'run' || c.action === 'march';
						const dir = c.facing === 'left' ? -1 : 1;
						const travel = c.travel ?? (moving ? (c.action === 'run' ? 0.45 : 0.22) : 0);
						const x = (c.x ?? 0.5) * 1080 + dir * travel * 1080 * prog;
						const s = baseScale * (c.scale ?? 1);
						return (
							<Figure
								key={i}
								kind={c.kind}
								action={c.action ?? 'idle'}
								x={x}
								y={groundY + (c.scale && c.scale < 1 ? -(1 - c.scale) * 60 : 0)}
								scale={s}
								facing={c.facing ?? 'right'}
								item={c.item}
								p={p}
								seed={i * 1.9}
							/>
						);
					})}
				</RimLight>
			</Canvas>
		</Layer>
	);
};
