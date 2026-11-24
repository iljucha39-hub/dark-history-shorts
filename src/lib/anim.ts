import {interpolate, random} from 'remotion';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** weiche, deterministische 1D-Rauschfunktion (Summe von Sinuswellen) */
export const noise1 = (seed: string | number, t: number) => {
	const a = random(`${seed}a`) * 6.28;
	const b = random(`${seed}b`) * 6.28;
	const c = random(`${seed}c`) * 6.28;
	return (Math.sin(t * 1.0 + a) * 0.5 + Math.sin(t * 2.3 + b) * 0.3 + Math.sin(t * 5.1 + c) * 0.2);
};

/** Bergkamm/Hügel als geschlossener SVG-Pfad */
export const ridgePath = (
	seed: string,
	baseY: number,
	amp: number,
	opts: {from?: number; to?: number; step?: number; freq?: number; bottom?: number} = {},
) => {
	const from = opts.from ?? -400;
	const to = opts.to ?? 1480;
	const step = opts.step ?? 30;
	const freq = opts.freq ?? 1;
	const bottom = opts.bottom ?? 2400;
	let d = `M ${from} ${bottom} L ${from} ${baseY}`;
	for (let x = from; x <= to; x += step) {
		const y = baseY - amp * (0.5 + 0.5 * noise1(seed, (x / 260) * freq));
		d += ` L ${x} ${y.toFixed(1)}`;
	}
	d += ` L ${to} ${bottom} Z`;
	return d;
};

/** Ein-/Ausblendung innerhalb einer Szene */
export const fadeInOut = (frame: number, duration: number, inF = 8, outF = 8) =>
	interpolate(frame, [0, inF, Math.max(inF + 1, duration - outF), duration], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
