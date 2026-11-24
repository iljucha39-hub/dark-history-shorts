import type {Mood} from './types';

export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;

export interface Palette {
	skyTop: string;
	skyMid: string;
	skyBottom: string;
	/** Lichtquelle: Mond, Feuer, Sonne */
	glow: string;
	/** ferne Hügel */
	far: string;
	/** mittlere Ebene */
	mid: string;
	/** Silhouetten im Vordergrund */
	near: string;
	/** Kantenlicht an Figuren */
	rim: string;
	accent: string;
	fog: string;
	paper: string;
	ink: string;
}

const base = {
	accent: '#c8102e',
	paper: '#d9c49a',
	ink: '#2a1a0e',
};

export const PALETTES: Record<Mood, Palette> = {
	night: {
		...base,
		skyTop: '#05070f',
		skyMid: '#111a2e',
		skyBottom: '#2a3550',
		glow: '#e8e4d0',
		far: '#1a2236',
		mid: '#10151f',
		near: '#05060a',
		rim: '#8fa3c7',
		fog: '#5a6a85',
	},
	blood: {
		...base,
		skyTop: '#0d0203',
		skyMid: '#3a0a0c',
		skyBottom: '#8a2a18',
		glow: '#ff9a5a',
		far: '#3a1210',
		mid: '#1e0807',
		near: '#080202',
		rim: '#ff7a4a',
		fog: '#6a2a20',
	},
	fog: {
		...base,
		skyTop: '#1a1d1f',
		skyMid: '#3c4240',
		skyBottom: '#6b706a',
		glow: '#d8d8c8',
		far: '#4a504c',
		mid: '#2a2e2c',
		near: '#0c0e0d',
		rim: '#b8bfb0',
		fog: '#9aa098',
	},
	fire: {
		...base,
		skyTop: '#0a0402',
		skyMid: '#3a1404',
		skyBottom: '#c2501a',
		glow: '#ffc060',
		far: '#4a1a08',
		mid: '#220a04',
		near: '#070201',
		rim: '#ffa040',
		fog: '#7a3a1a',
	},
	storm: {
		...base,
		skyTop: '#030608',
		skyMid: '#0f1f26',
		skyBottom: '#2c4a50',
		glow: '#cfe8ff',
		far: '#14262c',
		mid: '#0a1418',
		near: '#020506',
		rim: '#9fd0e0',
		fog: '#4a6a70',
	},
	gold: {
		...base,
		skyTop: '#0c0804',
		skyMid: '#3a2a10',
		skyBottom: '#a07a30',
		glow: '#ffe0a0',
		far: '#4a3818',
		mid: '#24190a',
		near: '#0a0703',
		rim: '#ffd27a',
		fog: '#8a7448',
	},
};

export const palette = (mood: Mood | undefined): Palette =>
	PALETTES[mood ?? 'night'] ?? PALETTES.night;

export const FONT_TITLE = 'Cinzel';
export const FONT_CAPTION = 'Montserrat';
