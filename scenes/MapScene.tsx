import React, {useMemo} from 'react';
import {geoMercator, geoPath} from 'd3-geo';
import type {Feature, FeatureCollection, MultiPolygon, Polygon} from 'geojson';
import {feature} from 'topojson-client';
import type {GeometryCollection, Topology} from 'topojson-specification';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import landTopo from 'world-atlas/land-50m.json';
import {Canvas, Layer} from '../src/components/Camera';
import {FONT_TITLE} from '../src/theme';
import {Particles} from './primitives/Environment';
import type {SceneProps} from './types';

// Küstenlinien: Natural Earth (Public Domain) über das npm-Paket world-atlas
const topo = landTopo as unknown as Topology<{land: GeometryCollection}>;
const land = feature(topo, topo.objects.land) as unknown as FeatureCollection<Polygon | MultiPolygon>;

const DEFAULT_BOUNDS: [number, number, number, number] = [-10, 35, 30, 60];

export const MapScene: React.FC<SceneProps> = ({visual, durationInFrames, p, index}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const spec = visual.map ?? {bounds: DEFAULT_BOUNDS};
	const [w, s, e, n] = spec.bounds;

	const {landPath, project} = useMemo(() => {
		const box: Feature<Polygon> = {
			type: 'Feature',
			properties: {},
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[w, s],
						[w, n],
						[e, n],
						[e, s],
						[w, s],
					],
				],
			},
		};
		const projection = geoMercator()
			.fitExtent(
				[
					[90, 380],
					[990, 1500],
				],
				box,
			)
			.clipExtent([
				[-400, -400],
				[1480, 2320],
			]);
		const path = geoPath(projection);
		return {
			landPath: path(land) ?? '',
			project: (lon: number, lat: number) => projection([lon, lat]) ?? [540, 960],
		};
	}, [w, s, e, n]);

	const markers = spec.markers ?? [];
	const route = spec.route ?? [];
	const routePts = route.map(([lo, la]) => project(lo, la));
	const routeD = routePts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`).join(' ');
	let routeLen = 0;
	for (let i = 1; i < routePts.length; i++) {
		routeLen += Math.hypot(routePts[i][0] - routePts[i - 1][0], routePts[i][1] - routePts[i - 1][1]);
	}
	const draw = interpolate(frame, [10, Math.max(20, durationInFrames - 20)], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.inOut(Easing.quad),
	});
	const spread =
		spec.spreadFrom !== undefined && markers[spec.spreadFrom]
			? project(markers[spec.spreadFrom].lon, markers[spec.spreadFrom].lat)
			: null;
	const clipId = `landclip${index}`;
	const ink = p.ink;

	return (
		<AbsoluteFill style={{background: '#1a120a'}}>
			<Layer depth={0.5}>
				<Canvas>
					<defs>
						<clipPath id={clipId}>
							<path d={landPath} />
						</clipPath>
						<radialGradient id={`sea${index}`} cx="50%" cy="45%" r="70%">
							<stop offset="0" stopColor="#5a4a30" />
							<stop offset="1" stopColor="#1e160c" />
						</radialGradient>
					</defs>
					<rect x={-400} y={-400} width={1880} height={2720} fill={`url(#sea${index})`} />
					{/* Wellenschraffur */}
					{new Array(40).fill(0).map((_, i) => (
						<path
							key={i}
							d={`M ${-300 + (i % 5) * 360} ${-200 + Math.floor(i / 5) * 300 + (i % 2) * 120} q 20 -12 40 0 q 20 12 40 0`}
							stroke={p.paper}
							strokeOpacity={0.18}
							strokeWidth={3}
							fill="none"
						/>
					))}
					<path d={landPath} fill={p.paper} />
					<path d={landPath} fill="none" stroke={ink} strokeWidth={3} strokeOpacity={0.8} />
					<path d={landPath} fill="none" stroke={ink} strokeWidth={14} strokeOpacity={0.12} />
					{/* Ausbreitung (z. B. Pest) */}
					{spread && (
						<g clipPath={`url(#${clipId})`}>
							<circle
								cx={spread[0]}
								cy={spread[1]}
								r={interpolate(frame, [0, durationInFrames], [20, 900], {easing: Easing.in(Easing.quad)})}
								fill={p.accent}
								opacity={0.45}
							/>
							{new Array(30).fill(0).map((_, i) => {
								const a = random(`sa${i}`) * Math.PI * 2;
								const r = random(`sd${i}`) * interpolate(frame, [0, durationInFrames], [20, 850]);
								return <circle key={i} cx={spread[0] + Math.cos(a) * r} cy={spread[1] + Math.sin(a) * r} r={8} fill="#5a0008" opacity={0.6} />;
							})}
						</g>
					)}
					{routeD && (
						<>
							<path
								d={routeD}
								fill="none"
								stroke={p.accent}
								strokeWidth={9}
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeDasharray={`${routeLen} ${routeLen}`}
								strokeDashoffset={routeLen * (1 - draw)}
							/>
							{routePts.length > 1 &&
								(() => {
									const target = draw * routeLen;
									let acc = 0;
									for (let i = 1; i < routePts.length; i++) {
										const seg = Math.hypot(routePts[i][0] - routePts[i - 1][0], routePts[i][1] - routePts[i - 1][1]);
										if (acc + seg >= target || i === routePts.length - 1) {
											const t = seg === 0 ? 1 : Math.min(1, (target - acc) / seg);
											const x = routePts[i - 1][0] + (routePts[i][0] - routePts[i - 1][0]) * t;
											const y = routePts[i - 1][1] + (routePts[i][1] - routePts[i - 1][1]) * t;
											return <circle cx={x} cy={y} r={16} fill={p.accent} stroke="#fff" strokeWidth={4} />;
										}
										acc += seg;
									}
									return null;
								})()}
						</>
					)}
					{markers.map((m, i) => {
						const [x, y] = project(m.lon, m.lat);
						const pop = spring({frame: frame - 8 - i * 10, fps, config: {damping: 10}});
						const pulse = 1 + 0.25 * Math.sin(frame / 6 + i);
						return (
							<g key={i} transform={`translate(${x} ${y}) scale(${pop})`}>
								<circle r={30 * pulse} fill={p.accent} opacity={0.25} />
								<circle r={13} fill={p.accent} stroke="#1a0a04" strokeWidth={4} />
								<text
									y={-34}
									textAnchor="middle"
									fontFamily={FONT_TITLE}
									fontWeight={900}
									fontSize={46}
									fill="#1a0a04"
									stroke={p.paper}
									strokeWidth={10}
									paintOrder="stroke"
								>
									{m.label}
								</text>
							</g>
						);
					})}
					{/* Kompassrose */}
					<g transform={`translate(890 1640) rotate(${Math.sin(frame / 40) * 4})`} opacity={0.75}>
						<circle r={80} fill="none" stroke={p.paper} strokeWidth={3} />
						<path d="M 0 -100 L 14 0 L 0 100 L -14 0 Z" fill={p.paper} />
						<path d="M -100 0 L 0 14 L 100 0 L 0 -14 Z" fill={p.paper} opacity={0.6} />
						<text y={-110} textAnchor="middle" fontFamily={FONT_TITLE} fontSize={36} fill={p.paper}>
							N
						</text>
					</g>
				</Canvas>
			</Layer>
			{spec.title && (
				<AbsoluteFill style={{alignItems: 'center', paddingTop: 250}}>
					<div
						style={{
							fontFamily: FONT_TITLE,
							fontWeight: 900,
							fontSize: 64,
							color: p.paper,
							letterSpacing: 6,
							textShadow: '0 4px 20px #000',
							opacity: interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp'}),
						}}
					>
						{spec.title}
					</div>
				</AbsoluteFill>
			)}
			<AbsoluteFill
				style={{
					boxShadow: 'inset 0 0 220px 80px rgba(20,10,4,0.95)',
				}}
			/>
			<Particles kind="dust" count={20} />
		</AbsoluteFill>
	);
};
