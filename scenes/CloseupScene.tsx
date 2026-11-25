import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Canvas, Layer} from '../src/components/Camera';
import {Bust} from './characters/Bust';
import {RimLight} from './characters/Figure';
import {Particles, Sky} from './primitives/Environment';
import type {SceneProps} from './types';

/**
 * Nahaufnahme: große Profil-Büste füllt das Bild, dahinter eine große
 * Sonne/Mond-Scheibe und optional wehende Flaggen – starke Silhouette,
 * gut lesbar auch als kleines Vorschaubild.
 */
export const CloseupScene: React.FC<SceneProps> = ({visual, p, index}) => {
	const frame = useCurrentFrame();
	const ch = visual.characters?.[0] ?? {kind: 'knight' as const, action: 'idle' as const};
	const flags = visual.flags ?? [];
	return (
		<AbsoluteFill>
			<Sky p={p} moon={false} stars={!p.sun} clouds={5} />
			<Layer depth={0.1}>
				<Canvas>
					<defs>
						<radialGradient id={`cdisc${index}`}>
							<stop offset="0" stopColor={p.glow} stopOpacity="0.45" />
							<stop offset="1" stopColor={p.glow} stopOpacity="0" />
						</radialGradient>
					</defs>
					<circle cx={600} cy={760} r={760} fill={`url(#cdisc${index})`} />
					<circle cx={600} cy={760} r={330} fill={p.glow} opacity={0.96} />
				</Canvas>
			</Layer>
			{flags.length > 0 && (
				<Layer depth={0.3}>
					<Canvas>
						{flags.map((c, i) => {
							const x = 80 + (i * 920) / Math.max(1, flags.length - 1);
							const w = (k: number) => Math.sin(frame / 6 + i + k) * 12;
							return (
								<g key={i}>
									<rect x={x} y={980} width={8} height={420} fill={p.near} />
									<path
										d={`M ${x + 8} 985 q 50 ${w(0)} 100 0 q 25 ${w(1)} 40 12 l -40 70 q -50 ${w(2)} -100 0 Z`}
										fill={c}
									/>
								</g>
							);
						})}
					</Canvas>
				</Layer>
			)}
			<Layer depth={0.2}>
				<Canvas>
					<path d="M -400 1500 Q 540 1420 1480 1500 L 1480 2400 L -400 2400 Z" fill={p.far} />
				</Canvas>
			</Layer>
			<Layer depth={0.7}>
				<Canvas>
					<RimLight id={`crim${index}`} color={p.rim} dx={6} dy={-4}>
						<Bust
							kind={ch.kind}
							x={(ch.facing === "left" ? 600 : 480) + (ch.x !== undefined ? (ch.x - 0.5) * 600 : 0)}
							y={1200}
							scale={1.8 * (ch.scale ?? 1)}
							facing={ch.facing ?? 'right'}
							p={p}
						/>
					</RimLight>
				</Canvas>
			</Layer>
			<Particles kind="dust" count={30} />
		</AbsoluteFill>
	);
};
